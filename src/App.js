import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client";

const App = () => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const microphoneRef = useRef(null);
  const socketRef = useRef(null);

  // Function to get microphone access
  const getMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return new MediaRecorder(stream, { mimeType: "audio/webm" });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  };

  // Function to open the microphone and start streaming data
  const openMicrophone = async (microphone, socket) => {
    return new Promise((resolve) => {
      microphone.onstart = () => {
        console.log("Microphone opened");
        document.body.classList.add("recording");
        resolve();
      };

      microphone.ondataavailable = (event) => {
        console.log("Microphone data received");
        if (event.data.size > 0 && socket.connected) {
          socket.emit("sendAudio", event.data);
        }
      };

      microphone.start(500); // Send audio chunks every 1 second
    });
  };

  // Function to close the microphone
  const closeMicrophone = async (microphone) => {
    microphone.stop();
    document.body.classList.remove("recording");
  };

  // Handle starting and stopping of microphone and Socket.IO connection
  const handleRecording = async () => {
    if (!isRecording) {
      try {
        const microphone = await getMicrophone();
        microphoneRef.current = microphone;

        await openMicrophone(microphone, socketRef.current);
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting recording:", error);
      }
    } else {
      if (microphoneRef.current) {
        await closeMicrophone(microphoneRef.current);
        microphoneRef.current = null;
        setIsRecording(false);
      }
    }
  };

  useEffect(() => {
    const socket = io('https://backend-483783451101.us-central1.run.app');
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("transcript", (data) => {
      if (data && data.channel && data.channel.alternatives[0].transcript) {
        const transcript = data.channel.alternatives[0].transcript;

        setTranscriptions((prev) => {
          if (data.is_final) {
            // Add a new line for final transcriptions
            return [...prev, transcript];
          } else {
            // Update the last transcription in the list
            const updatedTranscriptions = [...prev];
            if (updatedTranscriptions.length > 0) {
              updatedTranscriptions[updatedTranscriptions.length - 1] = transcript;
            } else {
              updatedTranscriptions.push(transcript);
            }
            return updatedTranscriptions;
          }
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Live Transcription with Deepgram</h1>
      <button onClick={handleRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <div style={{ marginTop: "20px", whiteSpace: "pre-wrap" }}>
        <h3>Transcriptions:</h3>
        <ul>
          {transcriptions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;