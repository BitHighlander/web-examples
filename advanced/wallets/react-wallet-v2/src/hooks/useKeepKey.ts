import SettingsStore from '@/store/SettingsStore'

//keepkey
import { AssetValue } from '@coinmasters/core';
import { Chain } from '@coinmasters/types';
interface KeepKeyWallet {
    type: string;
    icon: string;
    chains: string[];
    wallet: any;
    status: string;
    isConnected: boolean;
}
import { getPaths } from "@pioneer-platform/pioneer-coins";
import { ChainToNetworkId, getChainEnumValue } from '@coinmasters/types';

//old
import { createOrRestoreCosmosWallet } from '@/utils/CosmosWalletUtil'
import { createOrRestoreEIP155Wallet } from '@/utils/EIP155WalletUtil'
import { createOrRestoreSolanaWallet } from '@/utils/SolanaWalletUtil'
import { createOrRestorePolkadotWallet } from '@/utils/PolkadotWalletUtil'
import { createOrRestoreNearWallet } from '@/utils/NearWalletUtil'
import { createOrRestoreMultiversxWallet } from '@/utils/MultiversxWalletUtil'
import { createOrRestoreTronWallet } from '@/utils/TronWalletUtil'
import { createOrRestoreTezosWallet } from '@/utils/TezosWalletUtil'
import { createWeb3Wallet, web3wallet } from '@/utils/WalletConnectUtil'
import { createOrRestoreKadenaWallet } from '@/utils/KadenaWalletUtil'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useKeepKeyWallet } from "../context/WalletProvider";
import { useSnapshot } from 'valtio'

const getWalletByChain = async (keepkey: any, chain: any) => {
    if (!keepkey[chain]) return null;

    const walletMethods = keepkey[chain].walletMethods;
    const address = await walletMethods.getAddress();
    if (!address) return null;

    let balance = [];
    if (walletMethods.getPubkeys) {
        const pubkeys = await walletMethods.getPubkeys();
        for (const pubkey of pubkeys) {
            const pubkeyBalance = await walletMethods.getBalance([{ pubkey }]);
            balance.push(Number(pubkeyBalance[0].toFixed(pubkeyBalance[0].decimal)) || 0);
        }
        let assetValue = AssetValue.fromChainOrSignature(
            Chain.Bitcoin,
            balance.reduce((a, b) => a + b, 0),
        );
        balance = [assetValue];
    } else {
        balance = await walletMethods.getBalance([{ address }]);
    }

    return { address, balance };
};

let onStartKeepkey = async function(){
    try{
        // let chains =  [
        //     'ARB',  'AVAX', 'BNB',
        //     'BSC',  'BTC',  'BCH',
        //     'GAIA', 'OSMO', 'XRP',
        //     'DOGE', 'DASH', 'ETH',
        //     'LTC',  'OP',   'MATIC',
        //     'THOR'
        // ]
        const chains = ['ETH'];
        // @ts-ignore
        const { keepkeyWallet } = await import('@coinmasters/wallet-keepkey');

        const walletKeepKey: KeepKeyWallet = {
            type: 'KEEPKEY',
            icon: 'https://i.pinimg.com/originals/24/77/56/247756ac928c5f60fc786aef33485f17.jpg',
            chains,
            wallet: keepkeyWallet,
            status: 'offline',
            isConnected: false,
        };

        const allByCaip = chains.map((chainStr) => {
            const chain = getChainEnumValue(chainStr);
            if (chain) {
                return ChainToNetworkId[chain];
            }
            return undefined;
        });
        const paths = getPaths(allByCaip);
        let keepkey: any = {};
        // @ts-ignore
        // Implement the addChain function with additional logging
        function addChain({ chain, walletMethods, wallet }) {
            keepkey[chain] = {
                walletMethods,
                wallet
            };
        }

        let keepkeyConfig = {
            apiKey: localStorage.getItem('keepkeyApiKey') || '123',
            pairingInfo: {
                name: "Wallet Connect",
                imageUrl: "data:image/png;base64,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",
                basePath: 'http://localhost:1646/spec/swagger.json',
                url: 'http://localhost:1646',
            }
        }
        let covalentApiKey = process.env['NEXT_PUBLIC_COVALENT_API_KEY']
        let ethplorerApiKey = process.env['NEXT_PUBLIC_ETHPLORER_API_KEY']
        let utxoApiKey = process.env['NEXT_PUBLIC_BLOCKCHAIR_API_KEY']
        let input = {
            apis: {},
            rpcUrls: {},
            addChain,
            config: { keepkeyConfig, covalentApiKey, ethplorerApiKey, utxoApiKey },
        }

        // Step 1: Invoke the outer function with the input object
        const connectFunction = walletKeepKey.wallet.connect(input);

        // Step 2: Invoke the inner function with chains and paths
        let kkApikey = await connectFunction(chains, paths);
        console.log("kkApikey: ", kkApikey);
        localStorage.setItem('keepkeyApiKey', kkApikey);
        //got balances
        for (let i = 0; i < chains.length; i++) {
            let chain = chains[i]
            let walletData: any = await getWalletByChain(keepkey, chain);
            // keepkey[chain].wallet.address = walletData.address
            keepkey[chain].wallet.balance = walletData.balance
        }

        return keepkey;
    }catch(e){
        console.error(e)
        throw e
    }
}

export default function useKeepKey() {
    const [keepkey, setKeepKey] = useState(false)
    const prevRelayerURLValue = useRef<string>('')

    const { relayerRegionURL } = useSnapshot(SettingsStore.state)

    const onInitialize = useCallback(async () => {
        try {
            // const { eip155Addresses } = createOrRestoreEIP155Wallet()
            let keepkey = await onStartKeepkey()

            console.log("keepkey: ", keepkey);
            console.log("keepkey: ", keepkey.ETH);
            console.log("keepkey: ", keepkey.ETH.wallet);
            const eip155Addresses = keepkey.ETH.wallet.address
            console.log("eip155Addresses: ", eip155Addresses);
            // const { cosmosAddresses } = await createOrRestoreCosmosWallet()
            // const { solanaAddresses } = await createOrRestoreSolanaWallet()
            // const { polkadotAddresses } = await createOrRestorePolkadotWallet()
            // const { nearAddresses } = await createOrRestoreNearWallet()
            // const { multiversxAddresses } = await createOrRestoreMultiversxWallet()
            // const { tronAddresses } = await createOrRestoreTronWallet()
            // const { tezosAddresses } = await createOrRestoreTezosWallet()
            // const { kadenaAddresses } = await createOrRestoreKadenaWallet()

            SettingsStore.setEIP155Address(eip155Addresses)

            // SettingsStore.setCosmosAddress(cosmosAddresses[0])
            // SettingsStore.setSolanaAddress(solanaAddresses[0])
            // SettingsStore.setPolkadotAddress(polkadotAddresses[0])
            // SettingsStore.setNearAddress(nearAddresses[0])
            // SettingsStore.setMultiversxAddress(multiversxAddresses[0])
            // SettingsStore.setTronAddress(tronAddresses[0])
            // SettingsStore.setTezosAddress(tezosAddresses[0])
            // SettingsStore.setKadenaAddress(kadenaAddresses[0])
            console.log("relayerRegionURL: ", relayerRegionURL);
            await createWeb3Wallet(relayerRegionURL)
            // setInitialized(true)
            setKeepKey(keepkey)
        } catch (err: unknown) {
            alert(err)
        }
    }, [relayerRegionURL])

    // restart transport if relayer region changes
    const onRelayerRegionChange = useCallback(() => {
        try {
            web3wallet?.core?.relayer.restartTransport(relayerRegionURL)
            prevRelayerURLValue.current = relayerRegionURL
        } catch (err: unknown) {
            alert(err)
        }
    }, [relayerRegionURL])

    useEffect(() => {
        if (!keepkey) {
            onInitialize()
        }
        if (prevRelayerURLValue.current !== relayerRegionURL) {
            onRelayerRegionChange()
        }
    }, [keepkey, onInitialize, relayerRegionURL, onRelayerRegionChange])

    return keepkey
}
