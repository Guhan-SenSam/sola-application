import { useState, useRef, useCallback, useEffect } from 'react';
import { LiveAudioVisualizer } from 'react-audio-visualize';
import { Connection, PublicKey } from '@solana/web3.js';
import { transferSolTx } from '../lib/solana/transferSol';
import { MessageCard, LuloCard, TransactionCard } from '../types/messageCard';
import { SwapParams } from '../types/swap';
import { swapTx } from '../lib/solana/swapTx';
import { tools } from '../tools/tools';
import SessionControls from '../components/SessionControls';
import WalletUi from '../components/wallet/WalletUi';
import MessageList from '../components/ui/MessageList';
import { tokenList } from '../store/tokens/tokenMapping';
import { fetchMagicEdenLaunchpadCollections } from '../lib/solana/magiceden';
import { AssetsParams, DepositParams, WithdrawParams } from '../types/lulo';
import { depositLulo, getAssetsLulo, withdrawLulo } from '../lib/solana/lulo';
import useAppState from '../store/zustand/AppState';
import useChatState from '../store/zustand/ChatState';

const Conversation = () => {
  const {
    isSessionActive,
    setIsSessionActive,
    dataChannel,
    setDataChannel,
    mediaRecorder,
    setMediaRecorder,
    setPeerConnection,
    getPeerConnection,
  } = useChatState();

  const [isWalletVisible, setIsWalletVisible] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [messageList, setMessageList] = useState<MessageCard[]>();

  const { appWallet } = useAppState();
  if (!appWallet) return null;

  const rpc = process.env.SOLANA_RPC;

  const successResponse = () => {
    let msg = {
      type: 'response.create',
      response: {
        instructions: 'Ask what the user wants to do next.',
      },
    };
    return msg;
  };
  const errorResponse = (message: String) => {
    let msg = {
      type: 'response.error',
      response: {
        instructions: 'Error performing' + message,
      },
    };
    return msg;
  };

  const transferSol = async (amount: number, to: string) => {
    console.log('transferSol', amount, to);
    if (!rpc) return;
    const LAMPORTS_PER_SOL = 10 ** 9;
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Agent is transferring ${amount} SOL to ${to}`,
      },
    ]);

    const connection = new Connection(rpc);
    let balance = await connection.getBalance(new PublicKey(appWallet.address));
    if (balance / LAMPORTS_PER_SOL - 0.01 < amount) {
      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'message',
          message: 'Insufficient balance. Please maintain 0.01 balance minimum',
        },
      ]);
      return errorResponse('transfer');
    }

    const transaction = await transferSolTx(
      appWallet.address,
      to,
      amount * LAMPORTS_PER_SOL,
    );
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const signedTransaction = await appWallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
    );
    console.log(signature);
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'transaction',
        card: {
          title: 'Transaction',
          status: 'Pending',
          link: `https://solscan.io/tx/${signature}`,
        },
      },
    ]);

    return successResponse();

    // console.log(
    //   await connection.confirmTransaction({
    //     blockhash,
    //     lastValidBlockHeight,
    //     signature,
    //   }),
    // );
  };

  const handleSwap = async (
    quantity: number,
    tokenA: 'SOL' | 'SEND' | 'USDC',
    tokenB: 'SOL' | 'SEND' | 'USDC',
  ) => {
    if (!rpc) return;
    if (!tokenList[tokenA] || !tokenList[tokenB]) return;

    console.log(quantity * 10 ** tokenList[tokenA].DECIMALS, tokenA, tokenB);

    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Agent is performing the swap`,
      },
    ]);

    const params: SwapParams = {
      input_mint: tokenList[tokenA].MINT,
      output_mint: tokenList[tokenB].MINT,
      public_key: `${appWallet.address}`,
      amount: quantity * 10 ** tokenList[tokenA].DECIMALS,
    };

    const connection = new Connection(rpc);
    const transaction = await swapTx(params);
    if (!transaction) {
      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'message',
          message: `Error during Swap.`,
        },
      ]);
      return errorResponse('Swap');
    }
    const signedTransaction = await appWallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
    );
    console.log(signature);
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'message',
        message: 'Swap is success. ',
        link: `https://solscan.io/tx/${signature}`,
      },
    ]);

    // console.log(
    //   await connection.confirmTransaction({
    //     blockhash,
    //     lastValidBlockHeight,
    //     signature,
    //   }),
    // );

    return successResponse();
  };

  const handleUserAssetsLulo = async () => {
    if (!rpc) return;

    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Agent is fetching Lulo Assets`,
      },
    ]);

    const params: AssetsParams = {
      owner: `${appWallet.address}`,
    };
    const assets = await getAssetsLulo(params);

    if (!assets) return;

    let luloCardItem: LuloCard = assets;

    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'luloCard',
        card: luloCardItem,
      },
    ]);
    return successResponse();
  };

  const handleDepositLulo = async (
    amount: number,
    token: 'USDT' | 'USDS' | 'USDC',
  ) => {
    if (!rpc) return;
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Agent is depositing the asset`,
      },
    ]);
    const params: DepositParams = {
      owner: `${appWallet.address}`,
      depositAmount: amount,
      mintAddress: tokenList[token].MINT,
    };

    const connection = new Connection(rpc);

    const transaction_array = await depositLulo(params);
    if (!transaction_array) {
      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'message',
          message: `Deposit failed. Check your balance.`,
        },
      ]);
      return errorResponse(`Deposit ${amount} ${token}`);
    }

    for (const transaction in transaction_array) {
      let tx = transaction_array[transaction];
      let { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;

      const signedTransaction = await appWallet.signTransaction(
        transaction_array[transaction],
      );
      console.log(signedTransaction);

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );
      console.log(signature);
      let txCard: TransactionCard = {
        title: `Deposit ${amount} ${token}`,
        status: 'Successful',
        link: `https://solscan.io/tx/${signature}`,
      };

      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'transaction',
          card: txCard,
        },
      ]);
    }
    return successResponse();
  };

  const handleWithdrawLulo = async (
    amount: number,
    token: 'USDT' | 'USDS' | 'USDC',
  ) => {
    if (!rpc) return;
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Agent is withdrawing the asset`,
      },
    ]);
    let all = false;

    const assetParams: AssetsParams = {
      owner: `${appWallet.address}`,
    };
    let withdrawAmount = amount;
    const connection = new Connection(rpc);

    let assets = await getAssetsLulo(assetParams);
    if (assets) {
      let asset_list = assets.tokenBalance;
      asset_list.map((asset) => {
        if (asset.mint === tokenList[token].MINT) {
          if (asset.balance > 0) {
            if (asset.balance - amount < 100) {
              all = true;
              withdrawAmount = asset.balance;
              setMessageList((prev) => [
                ...(prev || []),
                {
                  type: 'agent',
                  message: `Lulo total must be greater than 100. Withdrawing all aseets`,
                },
              ]);
            }
          }
        }
      });
    }

    withdrawAmount = Math.ceil(withdrawAmount);

    const params: WithdrawParams = {
      owner: `${appWallet.address}`,
      withdrawAmount: withdrawAmount,
      mintAddress: tokenList[token].MINT,
      withdrawAll: all,
    };

    const transaction_array = await withdrawLulo(params);

    if (!transaction_array) {
      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'message',
          message: `Withdrawal failed. Check your balance.`,
        },
      ]);
      return errorResponse(`Withdraw ${withdrawAmount} ${token}`);
    }

    for (const transaction in transaction_array) {
      let tx = transaction_array[transaction];
      let { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;

      const signedTransaction = await appWallet.signTransaction(
        transaction_array[transaction],
      );
      console.log(signedTransaction);

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );
      console.log(signature);
      let txCard: TransactionCard = {
        title: `Withdraw ${amount} ${token}`,
        status: 'Successful',
        link: `https://solscan.io/tx/${signature}`,
      };

      setMessageList((prev) => [
        ...(prev || []),
        {
          type: 'transaction',
          card: txCard,
        },
      ]);
    }
    return successResponse();
  };
  const handleLaunchpadCollections = async () => {
    setMessageList((prev) => [
      ...(prev || []),
      {
        type: 'agent',
        message: `Fetching upcoming NFT launches`,
      },
    ]);
    try {
      const data = await fetchMagicEdenLaunchpadCollections();

      const formattedData: MessageCard[] = data.map((collection) => ({
        type: 'nftcards',
        card: {
          title: collection.name,
          descirption: collection.description,
          image: collection.image,
          price: collection.price,
          size: collection.size,
          date: collection.launchDatetime,
        },
      }));

      setMessageList((prevMessageList) => [
        ...(prevMessageList || []),
        ...formattedData,
      ]);

      return data;
    } catch (error) {
      console.error('Error fetching and processing collections:', error);
      return;
    }
  };

  const startSession = async () => {
    try {
      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement('audio');
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (audioElement.current) {
          audioElement.current.srcObject = stream;
        }

        if (MediaRecorder.isTypeSupported('audio/webm')) {
          const recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
          });
          setMediaRecorder(recorder);
          recorder.start();
        } else {
          console.error('MediaRecorder does not support audio/webm format.');
        }
      };

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel('oai-events');
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      console.log(model);

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });
      console.log(sdpResponse);

      if (!sdpResponse.ok) {
        throw new Error('Failed to fetch SDP response');
      }

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };

      console.log(answer);

      await pc.setRemoteDescription(answer);
      setPeerConnection(pc);
      setIsSessionActive(true);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  function stopSession() {
    const pc = getPeerConnection();

    if (dataChannel) {
      console.log('Stopping session');
      dataChannel.close();
    }
    if (pc) {
      pc.close();
      setPeerConnection(null);
    }

    setIsSessionActive(false);
    setDataChannel(null);
  }

  const sendClientEvent = useCallback(
    (message: any) => {
      if (dataChannel) {
        message.event_id = message.event_id || crypto.randomUUID();
        dataChannel.send(JSON.stringify(message));
        console.log('Message sent using datachannel:', message);
        console.log(events);
        setEvents((prev) => [message, ...prev]);
        console.log(events);
      } else {
        console.error(
          'Failed to send message - no data channel available',
          message,
        );
      }
    },

    [dataChannel],
  );

  function sendTextMessage(message: any) {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: 'response.create' });
  }

  function toggleWallet() {
    setIsWalletVisible(!isWalletVisible);
  }

  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener('message', (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener('open', () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const handleEvents = async () => {
      const firstEvent = events[events.length - 1];

      if (
        firstEvent.type === 'session.created' &&
        !events.some((e) => e.type === 'session.update')
      ) {
        sendClientEvent(tools);
      }

      const mostRecentEvent = events[0];

      if (
        mostRecentEvent.type === 'response.done' &&
        mostRecentEvent.response.output
      ) {
        for (const output of mostRecentEvent.response.output) {
          if (output.type === 'function_call') {
            console.log('function called');
            console.log(output);

            if (output.name === 'toggleWallet') {
              const { action } = JSON.parse(output.arguments);
              console.log(action);

              if (action === 'open' && !isWalletVisible) {
                console.log('open', isWalletVisible);
                toggleWallet();
              } else if (action === 'close' && isWalletVisible) {
                console.log('close', isWalletVisible);
                toggleWallet();
              }
              sendClientEvent({
                type: 'response.create',
                response: {
                  instructions: 'Ask what the user wants to do next.',
                },
              });
            } else if (output.name === 'transferSolTx') {
              const { quantity, address } = JSON.parse(output.arguments);
              let response = await transferSol(quantity, address);
              sendClientEvent(response);
            } else if (output.name === 'swapTokens') {
              const { quantity, tokenA, tokenB } = JSON.parse(output.arguments);
              let response = await handleSwap(quantity, tokenA, tokenB);
              sendClientEvent(response);
            } else if (output.name === 'getLuloAssets') {
              let response = await handleUserAssetsLulo();
              sendClientEvent({
                type: 'response.create',
                response: {
                  instruction : 'ask the user what they want to do next',
                },
              });
            } else if (output.name === 'depositLulo') {
              const { amount, token } = JSON.parse(output.arguments);
              let response = await handleDepositLulo(amount, token);
              sendClientEvent({
                type: 'response.create',
                response: {
                  instruction : 'ask the user what they want to do next',
                },
              });
            } else if (output.name === 'withdrawLulo') {
              const { amount, token } = JSON.parse(output.arguments);
              let response = await handleWithdrawLulo(amount, token);
              sendClientEvent(response);
            } else if (output.name === 'getNFTLaunchpad') {
              const data = await handleLaunchpadCollections();
              sendClientEvent({
                type: 'response.create',
                response: {
                  result: data,
                },
              });
            }
          }
        }
      }
    };

    handleEvents();
  }, [events, sendClientEvent]);

  return (
    <>
      <main className="h-screen flex flex-col relative">
        {/* Start of wallet */}
        <section className="absolute right-0 p-4">
          <WalletUi
            toggleWallet={toggleWallet}
            isWalletVisible={isWalletVisible}
          />
        </section>
        {/* End of wallet */}

        {/* Start of Visualizer Section */}
        <section
          className={`flex items-center justify-center ${
            messageList ? 'h-1/4' : 'h-1/2'
          }`}
        >
          {mediaRecorder && (
            <LiveAudioVisualizer
              barColor="#1D1D1F"
              mediaRecorder={mediaRecorder}
              width={400}
              height={200}
            />
          )}
        </section>
        {/* End of Visualizer Section */}

        {/* Start of Message display Section */}
        {messageList && (
          <section className="flex-grow flex justify-center items-start overflow-y-auto pb-20">
            <MessageList messageList={messageList} />
          </section>
        )}
        {/* End of Message display Section */}

        {/* Start of Session Controls Section */}
        
        {/* End of Session Controls Section */}
      </main>
      <section className="relative flex justify-center items-end w-full  bg-black">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-4 flex justify-center bg-white w-full">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendTextMessage={sendTextMessage}
              isSessionActive={isSessionActive}
            />
          </div>
        </section>
    </>
  );
};

export default Conversation;
