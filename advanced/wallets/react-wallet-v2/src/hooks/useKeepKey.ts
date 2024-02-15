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
            icon: 'data:image/png;base64,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',
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
                name: "Keepkey Template",
                imageUrl: "https://i.pinimg.com/originals/24/77/56/247756ac928c5f60fc786aef33485f17.jpg",
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
        //localStorage.setItem('keepkeyApiKey', kkApikey);
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
            setKeepKey(keepkey)
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
            await createWeb3Wallet(relayerRegionURL)
            // setInitialized(true)
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
