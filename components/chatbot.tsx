'use client'
import { useState, useEffect } from 'react';
import { FlowiseClient } from 'flowise-sdk';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from "react-markdown";
import { AudioButton } from './AudioButton';
import { ReactMediaRecorder } from "react-media-recorder";
import { PredictionData } from 'flowise-sdk/dist/flowise-sdk';

const client = new FlowiseClient({ baseUrl: 'http://localhost:3000' });
const CHATFLOW_ID = '0ce1cff3-3af0-4afa-9e88-fd664cc980af';

export default function Chatbot() {
  const [messages, setMessages] = useState([{ role: 'system', content: '¡Hola! ¿En qué puedo ayudarte?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null); // Persist last recorded audio

  const getAudio = async (text: string) => {

    const response = await fetch("/api/tts", {
        method: "POST",
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
      });
    
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        console.error("Error fetching TTS audio");
      }
  }
  useEffect(() => {
    if (audioBlob) {
      sendMessage();
    }
  }, [audioBlob]);

  useEffect(() => {
    if (messages[messages.length - 1]?.role === 'bot' && status === 'end') {
      getAudio(messages[messages.length - 1].content);
    }
  }, [status]);

  const sendMessage = async () => {
    if (!input.trim() && !audioBlob) {
      console.log('Please enter a message or select an audio file.');
      return;
    }

    if (audioBlob) {
      setLastAudioBlob(audioBlob); // Save last audio before sending
    }

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const predictionData: PredictionData = { chatflowId: CHATFLOW_ID, question: input, streaming: true, history: [
        {role: 'userMessage', content: input, message: input, type:'userMessage'}
      ]};
      function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, _) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const base64Audio = audioBlob ? await blobToBase64(audioBlob) : '';
      if (base64Audio) {
        predictionData.uploads = [{
          name: 'audio.webm',
          data: base64Audio,
          type: 'audio',
          mime: audioBlob?.type || ''
        }];
      }

      console.log(predictionData);
      const prediction = await client.createPrediction({
        ...predictionData,
        streaming: true
      });

      console.log('prediction:', prediction);
      let botResponse = '';
      for await (const chunk of prediction) {
        setStatus(chunk.event);
        console.log('chunk:', chunk);
        botResponse += chunk.event === 'token' ? chunk.data : '';
        setMessages((prev) => {
          const updatedMessages = [...prev];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.role === 'bot') {
            lastMessage.content = botResponse;
          } else {
            updatedMessages.push({ role: 'bot', content: botResponse });
          }
          return [...updatedMessages];
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
    setAudioBlob(null); // Reset audioBlob but keep lastAudioBlob
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 border rounded-lg shadow-md">
      <div className="h-96 w-auto overflow-y-auto p-2 space-y-2 bg-gray-100 rounded-md">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>
      <div className="flex mt-4 gap-2 items-center">
        <Input className='bg-white' value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje..." />
        <Button onClick={sendMessage} disabled={loading}>{loading ? 'Enviando...' : 'Enviar'}</Button>
        <ReactMediaRecorder render={
          ({ startRecording, stopRecording, mediaBlobUrl }) => (
            <AudioButton
            startRecording={startRecording}
            stopRecording={stopRecording}
            />
          )
        } onStart={() => setAudioBlob(null)} onStop={(url, blob) => {
          setAudioBlob(blob);
          console.log('the recording stopped', url, blob);
        }} audio={true} blobPropertyBag={{type: 'audio/webm'}}/>
        
        {/* Debugging Component - Persist Last Recorded Audio */}
        {lastAudioBlob && (
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-600">🎤 Último Audio Grabado:</span>
            <audio controls src={URL.createObjectURL(lastAudioBlob)} />
          </div>
        )}
      </div>
    </div>
  );
}
