'use client'
import { useState } from 'react';
import { Mic, Square } from 'lucide-react';

export const AudioButton = ({ startRecording, stopRecording }) => {
  const [recording, setRecording] = useState(false);

const onStop = () => {
    setRecording(false);
    stopRecording();
}

const onStart = () => {
    setRecording(true);
    startRecording();
}

  return (
    <button onClick={recording ? onStop : onStart} className="p-2 bg-blue-500 text-white rounded-lg">
      {recording ? <Square size={20} fill='red' /> : <Mic size={20} />}
    </button>
  );
};
