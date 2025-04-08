import React, { useState, useRef } from 'react';

function AudioUploader({ onTranscribe, callType, isLoading, setError }) {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile);
      
      // Create audio URL for preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setAudioUrl(objectUrl);
      
      // Clean up previous audio URL if it exists
      return () => {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    } else if (selectedFile) {
      setError('Please select a valid audio file');
      e.target.value = null;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        setFile(audioFile);
        
        // Create audio URL for preview
        const objectUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(objectUrl);
      };
      
      // Start the recording
      mediaRecorderRef.current.start();
      setRecording(true);
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please ensure you have given permission.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      
      // Stop all tracks on the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setRecording(false);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select an audio file or record audio first');
      return;
    }

    const formData = new FormData();
    formData.append('audioFile', file);
    formData.append('callType', callType);

    onTranscribe(formData);
  };

  // Clear selected file
  const clearFile = () => {
    setFile(null);
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="audio-uploader">
      <div className="upload-options">
        <div className="file-upload-section">
          <label htmlFor="audio-file" className="file-input-label">
            <span className="label-icon">🎵</span>
            <span>Select Audio File</span>
          </label>
          <input
            type="file"
            id="audio-file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={isLoading || recording}
            className="file-input"
          />
        </div>
      
        <div className="recording-section">
          <div className="record-buttons">
            {!recording ? (
              <button 
                className="record-button"
                onClick={startRecording}
                disabled={isLoading || audioUrl}
              >
                <span className="record-icon">⚫</span> Record Audio
              </button>
            ) : (
              <button 
                className="stop-button"
                onClick={stopRecording}
              >
                <span className="stop-icon">◼</span> Stop Recording
              </button>
            )}
          </div>
          
          {recording && (
            <div className="recording-indicator">
              <span className="recording-pulse"></span>
              <span className="recording-time">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
      </div>

      {audioUrl && (
        <div className="audio-preview">
          <h4>Audio Preview</h4>
          <audio 
            ref={audioRef}
            src={audioUrl} 
            controls 
            className="audio-player"
          />
          <button 
            className="clear-audio-button"
            onClick={clearFile}
            disabled={isLoading}
          >
            Remove Audio
          </button>
        </div>
      )}
      
      <div className="upload-actions">
        <button
          className="transcribe-button"
          onClick={handleUpload}
          disabled={isLoading || !file}
        >
          {isLoading ? 'Processing...' : 'Transcribe & Analyze'}
        </button>
        
        {file && (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">({Math.round(file.size / 1024)} KB)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioUploader; 