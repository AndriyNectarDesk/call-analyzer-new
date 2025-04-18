import React, { useState, useRef, useEffect } from 'react';

function AudioUploader({ onTranscribe, callType, isLoading, setError }) {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);

  // Cleanup function for audio URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  // Process the selected file
  const processFile = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile);
      
      // Create audio URL for preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setAudioUrl(objectUrl);
    } else if (selectedFile) {
      setError('Please select a valid audio file');
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger file input click
  const handleButtonClick = () => {
    fileInputRef.current.click();
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

  // Toggle URL input mode
  const toggleUrlInput = () => {
    setShowUrlInput(!showUrlInput);
    // Focus the input when showing
    if (!showUrlInput && urlInputRef.current) {
      setTimeout(() => urlInputRef.current.focus(), 100);
    }
  };

  // Process URL input for an audio file
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid audio file URL');
      return;
    }

    try {
      setUrlLoading(true);
      
      // Create form data with the URL
      const formData = new FormData();
      formData.append('audioUrl', urlInput);
      
      if (callType) {
        formData.append('callType', callType);
      }

      // Pass to the same handler but with a URL instead of a file
      onTranscribe(formData);
      
      // Clear URL input
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err) {
      console.error('Error processing URL:', err);
      setError('Failed to process the audio URL: ' + (err.message || 'Unknown error'));
    } finally {
      setUrlLoading(false);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select an audio file or record audio first');
      return;
    }

    const formData = new FormData();
    formData.append('audioFile', file);
    
    if (callType) {
      formData.append('callType', callType);
    }

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
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  return (
    <div className="audio-uploader">
      {!audioUrl ? (
        <div 
          className={`file-drop-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <p>Drag & drop audio file or</p>
          <div className="upload-buttons">
            <button 
              type="button" 
              className="select-file-btn"
              onClick={handleButtonClick}
              disabled={isLoading || recording || showUrlInput}
            >
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z" fill="currentColor"/>
              </svg>
              Select File
            </button>

            <button 
              className="record-button"
              onClick={startRecording}
              disabled={isLoading || showUrlInput}
            >
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/>
              </svg>
              Record Audio
            </button>
            
            <button
              className="url-button"
              onClick={toggleUrlInput}
              disabled={isLoading || recording}
            >
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor"/>
              </svg>
              Audio URL
            </button>
          </div>
          
          {showUrlInput ? (
            <div className="url-input-container">
              <input
                ref={urlInputRef}
                type="url"
                className="url-input"
                placeholder="Enter audio file URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading || urlLoading}
              />
              <div className="url-input-actions">
                <button 
                  className="url-submit"
                  onClick={handleUrlSubmit}
                  disabled={isLoading || urlLoading || !urlInput.trim()}
                >
                  {urlLoading ? (
                    <span className="spinner-small"></span>
                  ) : (
                    <>Process URL</>
                  )}
                </button>
                <button
                  className="url-cancel"
                  onClick={toggleUrlInput}
                  disabled={isLoading || urlLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <span className="file-format-info">Supports MP3, WAV, M4A files</span>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            id="audio-file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={isLoading || recording || showUrlInput}
            className="file-input"
          />
        </div>
      ) : (
        <div className="audio-preview">
          <div className="audio-preview-header">
            <div className="file-info">
              <svg className="file-icon" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
              </svg>
              <span className="file-name" title={file.name}>{file.name}</span>
              <button 
                className="clear-audio-button"
                onClick={clearFile}
                disabled={isLoading}
                title="Remove audio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          
          <audio 
            ref={audioRef}
            src={audioUrl} 
            controls 
            className="audio-player"
          />
          
          <button
            className="transcribe-button"
            onClick={handleUpload}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Processing...
              </>
            ) : (
              <>
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M14 9l-5 5.5 2.5 2.5 7.5-8-7.5-8-2.5 2.5 5 5.5zm-13 0l5 5.5-5 5.5 2.5 2.5 7.5-8-7.5-8-2.5 2.5z" fill="currentColor"/>
                </svg>
                Transcribe & Analyze
              </>
            )}
          </button>
        </div>
      )}
      
      {recording && (
        <div className="recording-indicator">
          <span className="recording-pulse"></span>
          <span className="recording-time">{formatTime(recordingTime)}</span>
          <button 
            className="stop-button"
            onClick={stopRecording}
          >
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 24 24" width="16">
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M6 6h12v12H6z" fill="currentColor"/>
            </svg>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

export default AudioUploader; 