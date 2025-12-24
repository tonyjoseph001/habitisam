"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface AudioRecorderProps {
    initialAudio?: string; // Base64 string
    onRecordingComplete: (base64: string) => void;
    onDelete: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    initialAudio,
    onRecordingComplete,
    onDelete
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(initialAudio || null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    // Initialize state from props
    useEffect(() => {
        if (initialAudio) {
            setAudioUrl(initialAudio);
        } else {
            setAudioUrl(null);
        }
    }, [initialAudio]);

    // Cleanup audio player on unmount
    useEffect(() => {
        return () => {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Convert to Base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    setAudioUrl(base64data);
                    onRecordingComplete(base64data);
                };

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playAudio = () => {
        if (!audioUrl) return;

        if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio(audioUrl);
            audioPlayerRef.current.onended = () => setIsPlaying(false);
        } else if (audioPlayerRef.current.src !== audioUrl) {
            // If URL changed
            audioPlayerRef.current.src = audioUrl;
        }

        audioPlayerRef.current.play();
        setIsPlaying(true);
    };

    const pauseAudio = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleDelete = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }
        setAudioUrl(null);
        setIsPlaying(false);
        onDelete();
    };

    return (
        <div className="w-full">
            {!audioUrl && !isRecording && (
                <button
                    onClick={startRecording}
                    className="w-full h-12 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-bold"
                >
                    <Mic className="w-5 h-5" />
                    Record Voice Note
                </button>
            )}

            {isRecording && (
                <div className="w-full h-12 bg-red-50 border-2 border-red-100 rounded-xl flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2.5 h-2.5 bg-red-500 rounded-full"
                        />
                        <span className="text-red-500 font-bold text-xs">Recording...</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 h-8 text-xs font-bold"
                    >
                        <Square className="w-3 h-3 fill-white mr-1" /> Stop
                    </Button>
                </div>
            )}

            {audioUrl && !isRecording && (
                <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between px-2 pr-3 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={isPlaying ? pauseAudio : playAudio}
                            className="w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center transition-colors text-slate-700"
                        >
                            {isPlaying ? <Pause className="w-4 h-4 fill-slate-700" /> : <Play className="w-4 h-4 fill-slate-700 pl-0.5" />}
                        </button>

                        <div className="flex flex-col">
                            <span className="text-slate-900 text-xs font-bold">Voice Note</span>
                            <span className="text-slate-500 text-[10px]">Recorded Audio</span>
                        </div>
                    </div>

                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
