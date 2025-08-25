import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import io from "socket.io-client";
import 'antd/dist/reset.css';
import {
    Layout,
    Button,
    Typography,
    Divider,
    Space,
    Badge,
    Row,
    Col,
    Input,
    Modal,
    message,
    Alert,
    ConfigProvider,
    Card,
    Empty,
    Dropdown
} from "antd";
import {
    DesktopOutlined,
    PoweroffOutlined,
    LinkOutlined,
    DownloadOutlined,
    CloseCircleOutlined,
    LaptopOutlined,
    CloseOutlined,
    UserOutlined,
    LockOutlined,
    RightOutlined,
    PlayCircleOutlined,
    CodeOutlined,
    AppstoreOutlined,
    TeamOutlined,
    EyeOutlined,
    VideoCameraOutlined,
    StopOutlined,
    DeleteOutlined,
    LogoutOutlined
} from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

// Create socket with reconnection options
const socket = io(
    "https://flydesk.pizeonfly.com",
    // "http://192.168.29.140:8080",
    {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });

function Main() {
    const canvasRef = useRef(null);
    const [hostId, setHostId] = useState("");
    const [availableHosts, setAvailableHosts] = useState([]);
    const [connected, setConnected] = useState(false);
    const [keyboardActive, setKeyboardActive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [modifierKeys, setModifierKeys] = useState({
        shift: false,
        control: false,
        alt: false,
        meta: false,
        capsLock: false
    });
    const [fullScreenMode, setFullScreenMode] = useState(false);
    const [currentHostInfo, setCurrentHostInfo] = useState(null);
    const [sessionCode, setSessionCode] = useState("");
    const [codeInputVisible, setCodeInputVisible] = useState(false);
    const [pendingConnection, setPendingConnection] = useState(false);
    const [pendingHostInfo, setPendingHostInfo] = useState(null);
    const [videoModalVisible, setVideoModalVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState(null);
    const [recordingProgress, setRecordingProgress] = useState(null);
    const [recordedFiles, setRecordedFiles] = useState([]);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const [recording, setRecording] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState(null);
    const [recordingModalVisible, setRecordingModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [connectByPasswordVisible, setConnectByPasswordVisible] = useState(false);
    const [hostPassword, setHostPassword] = useState("");
    const [machineIdInput, setMachineIdInput] = useState("");
    const [permanentAccessModalVisible, setPermanentAccessModalVisible] = useState(false);
    const [permanentAccessLabel, setPermanentAccessLabel] = useState("");
    const [permanentAccessPassword, setPermanentAccessPassword] = useState("");
    const [permanentAccessMachineId, setPermanentAccessMachineId] = useState("");
    const [savedHosts, setSavedHosts] = useState(() => {
        // Load saved hosts from localStorage
        try {
            const saved = localStorage.getItem('savedHosts');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load saved hosts", e);
            return [];
        }
    });
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Socket connection listeners
        socket.on("connect", () => {
            setConnectionStatus("Connected");

            if (hostId) {
                socket.emit("connect-to-host", hostId);
                socket.emit("request-screen", {
                    to: hostId,
                    from: socket.id
                });
            }
        });

        socket.on("disconnect", (reason) => {
            setConnectionStatus(`Disconnected: ${reason}. Reconnecting...`);
        });

        socket.io.on("reconnect_attempt", (attempt) => {
            setConnectionStatus(`Reconnecting... (attempt ${attempt})`);
        });

        socket.io.on("reconnect", () => {
            setConnectionStatus("Reconnected!");
            setTimeout(() => {
                setConnectionStatus("Connected");
            }, 2000);
        });

        // Keep-alive ping
        const pingInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit("keep-alive");
            }
        }, 15000);

        // Host availability handler
        socket.on("host-available", (hostInfo) => {
            setAvailableHosts(prev => {
                const exists = prev.some(host => host.id === hostInfo.id);
                if (exists) {
                    return prev.map(host =>
                        host.id === hostInfo.id ? hostInfo : host
                    );
                } else {
                    return [...prev, hostInfo];
                }
            });
        });

        // Screen data handler
        socket.on("screen-data", (data) => {
            if (!canvasRef.current) return;

            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current.getContext('2d');
                ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            };
            img.src = data.imageData;
        });

        // Key event handlers
        const handleKeyDown = (e) => {
            if (!hostId) return;

            // Track modifier keys
            if (e.key === 'Shift') setModifierKeys(prev => ({ ...prev, shift: true }));
            else if (e.key === 'Control') setModifierKeys(prev => ({ ...prev, control: true }));
            else if (e.key === 'Alt') setModifierKeys(prev => ({ ...prev, alt: true }));
            else if (e.key === 'Meta') setModifierKeys(prev => ({ ...prev, meta: true }));
            else if (e.key === 'CapsLock') setModifierKeys(prev => ({ ...prev, capsLock: !prev.capsLock }));

            e.preventDefault();

            socket.emit("remote-key-event", {
                to: hostId,
                type: "down",
                key: e.key,
                code: e.code,
                keyCode: e.keyCode,
                modifiers: {
                    shift: e.shiftKey,
                    control: e.ctrlKey,
                    alt: e.altKey,
                    meta: e.metaKey,
                    capsLock: e.getModifierState('CapsLock')
                }
            });
        };

        const handleKeyUp = (e) => {
            if (!hostId) return;

            // Update modifier key states
            if (e.key === 'Shift') setModifierKeys(prev => ({ ...prev, shift: false }));
            else if (e.key === 'Control') setModifierKeys(prev => ({ ...prev, control: false }));
            else if (e.key === 'Alt') setModifierKeys(prev => ({ ...prev, alt: false }));
            else if (e.key === 'Meta') setModifierKeys(prev => ({ ...prev, meta: false }));

            e.preventDefault();

            socket.emit("remote-key-event", {
                to: hostId,
                type: "up",
                key: e.key,
                code: e.code,
                keyCode: e.keyCode,
                modifiers: {
                    shift: e.shiftKey,
                    control: e.ctrlKey,
                    alt: e.altKey,
                    meta: e.metaKey,
                    capsLock: e.getModifierState('CapsLock')
                }
            });
        };

        // Add keyboard listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Connection handlers
        socket.on("host-disconnect-ack", () => {
            setHostId("");
            setConnected(false);
            setKeyboardActive(false);
        });

        socket.on("code-accepted", (hostInfo) => {
            message.success("Code accepted! Waiting for host approval...");
            setPendingConnection(true);
            setPendingHostInfo(hostInfo);
        });

        socket.on("code-rejected", (data) => {
            message.error(data.message || "Invalid session code");
            setPendingConnection(false);
        });

        socket.on("connection-accepted", (hostInfo) => {
            message.success("Connection approved by host!");
            setPendingConnection(false);

            setHostId(hostInfo.hostId);
            setConnected(true);
            setFullScreenMode(true);
            setCurrentHostInfo({
                id: hostInfo.hostId,
                name: hostInfo.hostName
            });

            socket.emit("connect-to-host", hostInfo.hostId);
            socket.emit("request-screen", {
                to: hostInfo.hostId,
                from: socket.id
            });

            setKeyboardActive(true);
        });

        socket.on("connection-rejected", () => {
            message.error("Connection rejected by host");
            setPendingConnection(false);
            setPendingHostInfo(null);
        });

        socket.on("recording-status", (data) => {
            setRecordingStatus(data.status);
            if (data.progress) {
                setRecordingProgress(data.progress);
            }
            if (data.error) {
                message.error(`Recording error: ${data.error}`);
            }

            if (data.status === "recording") {
                setIsRecording(true);
            } else if (["error", "stopped", "cancelled"].includes(data.status)) {
                setIsRecording(false);
            }
        });

        socket.on("recording-complete", (data) => {
            setIsRecording(false);
            setRecordingStatus("completed");

            message.success(`Recording completed! Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`);

            // Add to recorded files list
            setRecordedFiles(prev => [...prev, {
                id: data.recordingId,
                duration: data.duration,
                size: data.fileSize,
                date: new Date().toLocaleString(),
                path: data.filePath
            }]);
        });

        // Add password-related event listeners
        socket.on("password-set-notification", (data) => {
            message.success("Password set successfully for this connection!");

            // Save this host in localStorage for future connections
            const newSavedHost = {
                hostId: data.hostId,
                machineId: data.machineId,
                name: currentHostInfo?.name || "Unknown Host",
                lastConnected: new Date().toISOString()
            };

            setSavedHosts(prev => {
                // Update if exists, add if not
                const updated = prev.some(h => h.machineId === data.machineId)
                    ? prev.map(h => h.machineId === data.machineId ? { ...h, ...newSavedHost } : h)
                    : [...prev, newSavedHost];

                // Save to localStorage
                localStorage.setItem('savedHosts', JSON.stringify(updated));
                return updated;
            });
        });

        socket.on("password-auth-response", (data) => {
            if (data.success) {
                message.success("Password accepted!");
            } else {
                message.error(data.message || "Password authentication failed");
            }
        });

        socket.on("permanent-access-set-notification", (data) => {
            message.success(`Permanent access set successfully for ${data.computerName}!`);
            
            // Save this host in localStorage for future connections
            const newSavedHost = {
                hostId: data.hostId,
                machineId: data.machineId,
                name: data.computerName,
                label: data.label,
                lastConnected: new Date().toISOString(),
                permanentAccess: true
            };

            setSavedHosts(prev => {
                // Update if exists, add if not
                const updated = prev.some(h => h.machineId === data.machineId)
                    ? prev.map(h => h.machineId === data.machineId ? { ...h, ...newSavedHost } : h)
                    : [...prev, newSavedHost];

                // Save to localStorage
                localStorage.setItem('savedHosts', JSON.stringify(updated));
                return updated;
            });
        });

        socket.on("permanent-access-auth-response", (data) => {
            if (data.success) {
                message.success("Permanent access authentication successful!");
            } else {
                message.error(data.message || "Permanent access authentication failed");
            }
        });

        return () => {
            // Cleanup
            socket.off("host-available");
            socket.off("screen-data");
            socket.off("connect");
            socket.off("disconnect");
            socket.io.off("reconnect_attempt");
            socket.io.off("reconnect");
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            clearInterval(pingInterval);
            socket.off("password-set-notification");
            socket.off("password-auth-response");
            socket.off("permanent-access-set-notification");
            socket.off("permanent-access-auth-response");
        };
    }, [hostId, modifierKeys]);

    // Save hosts to localStorage when they change
    useEffect(() => {
        localStorage.setItem('savedHosts', JSON.stringify(savedHosts));
    }, [savedHosts]);

    const connectToHost = (hostInfo) => {
        setHostId(hostInfo.id);
        setConnected(true);
        setFullScreenMode(true);
        setCurrentHostInfo(hostInfo);

        socket.emit("connect-to-host", hostInfo.id);
        socket.emit("request-screen", {
            to: hostInfo.id,
            from: socket.id
        });

        setKeyboardActive(true);
    };

    // Mouse handlers
    const handleMouseMove = (e) => {
        if (!hostId) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        socket.emit("remote-mouse-move", {
            to: hostId,
            x: scaledX,
            y: scaledY,
            screenWidth: canvasRef.current.width,
            screenHeight: canvasRef.current.height
        });
    };

    const handleMouseClick = (e) => {
        e.preventDefault();
        if (!hostId) return;

        let button = "left";
        if (e.button === 1) button = "middle";
        if (e.button === 2) button = "right";

        socket.emit("remote-mouse-click", {
            to: hostId,
            button: button
        });
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    const handleMouseWheel = (e) => {
        if (!hostId) return;
        e.preventDefault();

        const delta = e.deltaY || e.detail || e.wheelDelta;

        socket.emit("remote-mouse-scroll", {
            to: hostId,
            deltaY: delta
        });
    };

    // Define the handleDisconnect function first 
    const handleDisconnect = () => {
        // Stop recording if it's active
        if (recording) {
            stopRecording();
        }

        // Then handle disconnection
        if (hostId) {
            socket.emit("client-disconnect-request", {
                from: socket.id,
                to: hostId
            });

            setTimeout(() => {
                setHostId("");
                setConnected(false);
                setKeyboardActive(false);
                setCurrentHostInfo(null);
            }, 500);
        }
        setFullScreenMode(false);
    };

    const showCodeInput = () => {
        setCodeInputVisible(true);
    };

    const handleCodeSubmit = () => {
        if (!sessionCode || sessionCode.length !== 6) {
            message.error("Please enter a valid 6-digit code");
            return;
        }

        socket.emit("connect-with-code", { code: sessionCode });
        setCodeInputVisible(false);
    };

    const showVideoModal = () => {
        setVideoModalVisible(true);
    };

    const closeVideoModal = () => {
        setVideoModalVisible(false);
    };

    // Global CSS styles
    const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #000000;
      color: #FFFFFF;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    * {
      box-sizing: border-box;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.3; }
      100% { opacity: 1; }
    }
  `;

    // Add these functions to start and stop recording
    const startRecording = async () => {
        try {
            // Request screen capture with audio
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Reset recorded chunks
            recordedChunksRef.current = [];

            // Create media recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            // Handle data availability
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedVideo(url);
                setRecordingModalVisible(true);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording
            mediaRecorder.start();
            setRecording(true);
            message.success("Screen recording started");
        } catch (error) {
            console.error("Error starting recording:", error);
            message.error("Failed to start recording: " + error.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            message.success("Recording stopped");
        }
    };

    const closeRecordingModal = () => {
        setRecordingModalVisible(false);
    };

    // Add a new function to handle connecting with password
    const handlePasswordConnect = () => {
        if (!machineIdInput || !hostPassword) {
            message.error("Please enter both Machine ID and Password");
            return;
        }

        socket.emit("connect-with-password", {
            machineId: machineIdInput,
            password: hostPassword
        });

        setConnectByPasswordVisible(false);
        setMachineIdInput("");
        setHostPassword("");
    };

    // Function to handle connecting with permanent access
    const handlePermanentAccessConnect = () => {
        if (!permanentAccessLabel || !permanentAccessPassword || !permanentAccessMachineId) {
            message.error("Please enter all required fields");
            return;
        }

        socket.emit("connect-with-permanent-access", {
            machineId: permanentAccessMachineId,
            label: permanentAccessLabel,
            password: permanentAccessPassword
        });

        setPermanentAccessModalVisible(false);
        setPermanentAccessLabel("");
        setPermanentAccessPassword("");
        setPermanentAccessMachineId("");
    };

    // Add this to show the password connect modal
    const showConnectByPassword = () => {
        setConnectByPasswordVisible(true);
    };

    // Function to show permanent access modal
    const showPermanentAccessModal = (host = null) => {
        if (host) {
            setPermanentAccessMachineId(host.machineId);
            setPermanentAccessLabel(host.label || "");
        }
        setPermanentAccessModalVisible(true);
    };

    // Add a helper to connect to a saved host
    const connectToSavedHost = (host) => {
        setMachineIdInput(host.machineId);
        setConnectByPasswordVisible(true);
    };

    // With confirmation dialog
    const deleteSavedHost = (machineId) => {
        console.log('Deleting host with machine ID:', machineId);
        console.log('Current savedHosts:', savedHosts);

        if (window.confirm('Are you sure you want to delete this connection?')) {
            const updatedHosts = savedHosts.filter(host => host.machineId !== machineId);
            console.log('Updated savedHosts:', updatedHosts);

            setSavedHosts(updatedHosts);
            localStorage.setItem('savedHosts', JSON.stringify(updatedHosts));
            message.success('Connection deleted successfully');
        }
    };

    // Add this effect to check for logged in user
    useEffect(() => {
        const checkUser = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (error) {
                    console.error('Error parsing user data', error);
                    setUser(null);
                }
            }
        };
        
        checkUser();
    }, []);
    
    // Add logout function
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        message.success('Logged out successfully');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#000' }}>
            {/* Inject global styles */}
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

            {fullScreenMode ? (
                // Fullscreen mode when connected to a host - with updated UI
                <div style={{
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#000',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 24px',
                        background: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <Space>
                            <Badge color="#00FFFF" status="processing" />
                            <Text style={{ color: 'white', fontWeight: 500 }}>
                                Connected to: {currentHostInfo ? currentHostInfo.name : `Host ${hostId.substring(0, 8)}`}
                            </Text>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                                Live session
                            </Text>
                        </Space>

                        <Space>
                            {/* Add recording button */}
                            <Button
                                type={recording ? "danger" : "primary"}
                                icon={recording ? <StopOutlined /> : <VideoCameraOutlined />}
                                onClick={recording ? stopRecording : startRecording}
                                style={{
                                    background: recording ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 183, 255, 0.2)',
                                    borderColor: recording ? 'rgba(255, 77, 79, 0.5)' : 'rgba(0, 183, 255, 0.5)',
                                    color: recording ? '#ff4d4f' : '#00b7ff',
                                    fontWeight: 500,
                                    borderRadius: '6px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '10px'
                                }}
                            >
                                {recording ? 'Stop Recording' : 'Record Screen'}
                            </Button>

                            {/* Existing disconnect button */}
                            <Button
                                type="primary"
                                danger
                                icon={<CloseCircleOutlined />}
                                onClick={handleDisconnect}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    fontWeight: 500,
                                    borderRadius: '6px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                Exit Session
                            </Button>
                        </Space>
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: '#000',
                        position: 'relative',
                        padding: '20px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 70px rgba(0, 0, 0, 0.5)',
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 90px)'
                        }}>
                            <canvas
                                ref={canvasRef}
                                width="1280"
                                height="720"
                                onMouseMove={handleMouseMove}
                                onMouseDown={handleMouseClick}
                                onContextMenu={handleContextMenu}
                                onWheel={handleMouseWheel}
                                style={{
                                    width: 'auto',
                                    height: 'auto',
                                    maxWidth: '100%',
                                    maxHeight: 'calc(100vh - 90px)',
                                    display: 'block'
                                }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pointerEvents: 'none',
                                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}></div>
                        </div>
                    </div>
                </div>
            ) : (
                // Framer-inspired modern layout
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    background: '#000',
                    color: '#fff',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    {/* Modern Header */}
                    <header style={{
                        background: "#0f0f0f00",
                        backdropFilter: "blur(20px)",
                        padding: "16px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                        <div>
                            <img src="Images/flydesk1.png" style={{ height: "35px", background: "transparent" }} alt="FLYDESK" />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <Badge color={connectionStatus.includes("Connected") ? "#00FFFF" :
                                    connectionStatus.includes("Reconnecting") ? "#F5A623" : "#FF4D4F"}
                                    status="processing" />
                                <Text style={{ color: "rgba(255, 255, 255, 0.8)", margin: 0, fontSize: "14px" }}>
                                    {connectionStatus}
                                </Text>
                            </div>

                            <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/FlyDeskApp+Setup+1.0.0.exe">
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    style={{
                                        height: "38px",
                                        padding: "0 20px",
                                        background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                                        borderColor: "transparent",
                                        borderRadius: "6px",
                                        fontWeight: 500,
                                        boxShadow: "0 4px 12px rgba(0, 128, 255, 0.3)",
                                        transition: "all 0.2s ease-in-out",
                                    }}
                                    title="Secure app that lets you control your computer remotely with a 6-digit code. You maintain full access control with Accept/Reject prompts."
                                >
                                    Download FLYDESK App
                                </Button>
                            </a>
                            
                            {user ? (
                                <Dropdown menu={{
                                    items: [
                                        {
                                            key: '1',
                                            label: 'Profile',
                                            icon: <UserOutlined />,
                                        },
                                        {
                                            key: '2',
                                            label: 'Logout',
                                            icon: <LogoutOutlined />,
                                            onClick: handleLogout,
                                        },
                                    ],
                                }} placement="bottomRight">
                                    <Button
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderColor: 'rgba(255, 255, 255, 0.05)',
                                            color: '#fff',
                                            height: '38px',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        <UserOutlined />
                                        <span>{user.username}</span>
                                    </Button>
                                </Dropdown>
                            ) : (
                                <Space>
                                    <Link to="/login">
                                        <Button
                                            style={{
                                                height: "38px",
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                borderColor: 'rgba(255, 255, 255, 0.05)',
                                                color: '#fff',
                                                borderRadius: '6px',
                                            }}
                                        >
                                            Login
                                        </Button>
                                    </Link>
                                    <Link to="/signup">
                                        <Button
                                            style={{
                                                height: "38px",
                                                background: 'rgba(0, 106, 255, 0.2)',
                                                borderColor: 'rgba(0, 106, 255, 0.3)',
                                                color: '#00BFFF',
                                                borderRadius: '6px',
                                            }}
                                        >
                                            Sign Up
                                        </Button>
                                    </Link>
                                </Space>
                            )}
                        </div>
                    </header>

                    {/* Main Content Area with Hero Section */}
                    <main style={{ flex: 1 }}>
                        {/* Hero Section */}
                        <section style={{
                            background: "#000",
                            padding: "50px 20px 60px",
                            textAlign: "center",
                            color: "white",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                            {/* Background effects */}
                            <div style={{
                                position: "absolute",
                                top: "5%",
                                left: "10%",
                                width: "500px",
                                height: "500px",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(0,183,255,0.15) 0%, rgba(0,183,255,0) 70%)",
                                filter: "blur(40px)",
                                zIndex: 0
                            }}></div>
                            <div style={{
                                position: "absolute",
                                bottom: "10%",
                                right: "5%",
                                width: "400px",
                                height: "400px",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(0,106,255,0.1) 0%, rgba(0,106,255,0) 70%)",
                                filter: "blur(40px)",
                                zIndex: 0
                            }}></div>

                            <div className="row" style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 1 }}>
                                <div className="col-6" >
                                    <Title level={1} style={{
                                        color: "white",
                                        fontSize: "clamp(2.5rem, 5vw, 4rem)",
                                        marginBottom: "20px",
                                        fontWeight: "700",
                                        letterSpacing: "-0.03em",
                                        lineHeight: "1.1"
                                    }}>
                                        Remote Control Made <br /> Simple & Secure
                                    </Title>
                                    <Paragraph style={{
                                        fontSize: "clamp(1rem, 2vw, 1.25rem)",
                                        color: "rgba(255,255,255,0.7)",
                                        maxWidth: "650px",
                                        margin: "0 auto 50px",
                                        lineHeight: "1.6",
                                        fontWeight: "400"
                                    }}>
                                        Connect securely to any computer anywhere in the world with FLYDESK's powerful remote desktop solution.
                                    </Paragraph>
                                </div>



                                <div className="col" style={{
                                    background: "rgba(255,255,255,0.03)",
                                    backdropFilter: "blur(10px)",
                                    borderRadius: "12px",
                                    padding: "40px",
                                    maxWidth: "500px",
                                    margin: "60px auto 0",
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                                    border: "1px solid rgba(255,255,255,0.05)"
                                }}>
                                    <Title level={3} style={{
                                        color: "white",
                                        marginBottom: "25px",
                                        fontWeight: "600",
                                        fontSize: "24px"
                                    }}>
                                        <Space>
                                            <LinkOutlined style={{ color: "#00BFFF" }} />
                                            Connect to Remote Desktop
                                        </Space>
                                    </Title>

                                    <Paragraph style={{
                                        color: "rgba(255,255,255,0.7)",
                                        marginBottom: "25px",
                                        fontSize: "15px"
                                    }}>
                                        Enter the 6-digit session code provided by the host computer
                                    </Paragraph>

                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<LinkOutlined />}
                                        onClick={showCodeInput}
                                        style={{
                                            height: "50px",
                                            fontSize: "16px",
                                            fontWeight: "500",
                                            padding: "0 30px",
                                            background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                                            borderColor: "transparent",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 20px rgba(0, 128, 255, 0.3)",
                                            transition: "all 0.2s ease-in-out",
                                            width: "100%"
                                        }}
                                    >
                                        Connect with Session Code
                                    </Button>

                                    {pendingConnection && pendingHostInfo && (
                                        <div style={{ marginTop: "24px" }}>
                                            <Alert
                                                message="Connection Request Pending"
                                                description={`Waiting for ${pendingHostInfo.hostName} to approve your connection...`}
                                                type="warning"
                                                showIcon
                                                style={{
                                                    background: "rgba(241, 163, 7, 0.34)",
                                                    borderColor: "rgba(250, 173, 20, 0.81)",
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>


                        {/* Secure Remote Access with FlyDesk Section */}
                        <section style={{
                            padding: "100px 0",
                            background: "linear-gradient(to bottom, #000 0%, #050505 100%)",
                            position: "relative",
                            overflow: "hidden",
                            textAlign: "center"
                        }}>
                            {/* Glow effects */}
                            <div style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "600px",
                                height: "600px",
                                transform: "translate(-50%, -50%)",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(0,183,255,0.08) 0%, rgba(0,0,0,0) 70%)",
                                zIndex: 0
                            }}></div>

                            <div style={{ position: "relative", zIndex: 1 }}>
                                <div style={{
                                    width: "80px",
                                    height: "80px",
                                    margin: "0 auto 30px",
                                    borderRadius: "20px",
                                    // background: "linear-gradient(135deg, #0f0f0f 0%, #111111 100%)",
                                    background: 'linear-gradient(135deg, #00BFFF 0%, #8B5CF6 100%)',

                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 0 40px rgba(0,128,255,0.5)",
                                    transform: "perspective(800px) rotateX(10deg)",
                                    padding: "15px"
                                }}>
                                    <img
                                        src="/flydesk12.png"
                                        alt="Logo"
                                        style={{
                                            width: "120%",
                                            height: "100%",
                                            objectFit: "contain"
                                        }}
                                    />
                                </div>

                                <Title level={2} style={{
                                    color: "#fff",
                                    fontSize: "clamp(2rem, 5vw, 3.5rem)",
                                    fontWeight: "700",
                                    marginBottom: "20px",
                                    letterSpacing: "-0.02em"
                                }}>
                                    Secure Remote Access with FlyDesk
                                </Title>

                                <Paragraph style={{
                                    fontSize: "18px",
                                    color: "rgba(255,255,255,0.7)",
                                    maxWidth: "700px",
                                    margin: "0 auto 40px",
                                    lineHeight: "1.6"
                                }}>
                                    Your computer remains completely secure until you download and authorize the FlyDesk app.
                                    Once installed, you'll receive a unique 6-digit session code that you can share with trusted users.
                                    When someone enters this code, you'll get an explicit "Accept or Reject" prompt, giving you full
                                    control over access. No authorization, no access—it's that simple. Need to end the session?
                                    Just close the app and all remote connections will terminate instantly. Your security is always in your hands.
                                </Paragraph>
                                <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/FlyDeskApp+Setup+1.0.0.exe">
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<DownloadOutlined />}

                                        // onClick={showCodeInput}
                                        style={{
                                            height: "56px",
                                            padding: "0 40px",
                                            fontSize: "18px",
                                            fontWeight: "600",
                                            background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                                            borderColor: "transparent",
                                            borderRadius: "28px",
                                            boxShadow: "0 5px 20px rgba(0,128,255,0.4)"
                                        }}
                                    >
                                        FLYDESK APP
                                    </Button>
                                </a>
                            </div>
                        </section>

                        {/* Quick Start Guide Section */}
                        <section style={{
                            padding: "100px 0",
                            background: "#000",
                            position: "relative"
                        }}>
                            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>
                                <Row gutter={[40, 40]} align="middle">
                                    <Col xs={24} md={12}>
                                        <div style={{
                                            position: "relative",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            aspectRatio: "16/9",
                                            background: "#13151A",
                                            border: "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            <video
                                                src="Images/video.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Title level={2} style={{
                                            color: "#fff",
                                            fontSize: "30px",
                                            marginBottom: "20px",
                                            fontWeight: "600",
                                            letterSpacing: "-0.02em"
                                        }}>
                                            Quick Start Guide
                                        </Title>
                                        <Paragraph style={{
                                            fontSize: "16px",
                                            color: "rgba(255,255,255,0.7)",
                                            marginBottom: "30px",
                                            lineHeight: "1.6"
                                        }}>
                                            New to remote desktop technology? Watch our introductory video to learn the basics.
                                            This short tutorial covers how to connect to remote computers, transfer files,
                                            and troubleshoot common issues in just a few minutes.
                                        </Paragraph>
                                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                            {/* <Button
                        type="primary"
                        size="large"
                        icon={<RightOutlined />}
                        style={{
                          height: "46px",
                          background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                          borderColor: "transparent",
                          width: "100%",
                          textAlign: "left",
                          borderRadius: "8px"
                        }}
                      >
                        Start Fundamentals
                      </Button> */}
                                            <Button
                                                type="default"
                                                size="large"
                                                icon={<PlayCircleOutlined />}
                                                onClick={showVideoModal}
                                                style={{
                                                    height: "46px",
                                                    background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                                                    borderColor: "rgba(255,255,255,0.1)",
                                                    color: "#fff",
                                                    width: "100%",
                                                    textAlign: "left",
                                                    borderRadius: "8px"
                                                }}
                                            >
                                                Watch Introduction
                                            </Button>
                                        </Space>
                                    </Col>
                                </Row>
                            </div>
                        </section>

                        {/* Pizeonfly Advertisement Section with Framer-style UI */}
                        {/* <section style={{
              padding: "80px 0",
              background: `url('Images/pizeonfly.png')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0, 0, 0, 0.9)",
                zIndex: 0
              }}></div>

              <div style={{
                position: "absolute",
                top: "-50px",
                left: "-50px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(0, 183, 255, 0)",
                filter: "blur(50px)",
                zIndex: 0
              }}></div>
              <div style={{
                position: "absolute",
                bottom: "-80px",
                right: "10%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "rgba(0,106,255,0.05)",
                filter: "blur(50px)",
                zIndex: 0
              }}></div>

              <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", position: "relative", zIndex: 1 }}>
                <Row gutter={[50, 40]} align="middle">
                  <Col xs={24} md={12}>
                    <div style={{ color: "#fff" }}>
                      <Title level={2} style={{
                        color: "#fff",
                        marginBottom: "25px",
                        fontSize: "36px",
                        fontWeight: "600",
                        lineHeight: "1.2",
                        letterSpacing: "-0.02em"
                      }}>
                        Website Design and Digital Marketing Agency
                      </Title>
                      <Paragraph style={{
                        fontSize: "16px",
                        marginBottom: "30px",
                        lineHeight: "1.7",
                        color: "rgba(255, 255, 255, 0.7)"
                      }}>
                        At Pizeonfly, we don't just design websites, we build digital experiences
                        that elevate your brand and drive lasting success. Our team of experts creates
                        stunning websites that convert visitors into customers.
                      </Paragraph>
                      <Space size="large">
                        <a href="https://pizeonfly.com" target="_blank">
                          <Button
                            type="primary"
                            size="large"
                            style={{
                              background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                              borderColor: "transparent",
                              height: "46px",
                              padding: "0 28px",
                              fontSize: "16px",
                              fontWeight: "500",
                              borderRadius: "8px",
                              boxShadow: "0 6px 16px rgba(0,106,255,0.3)"
                            }}
                          >
                            Learn More
                          </Button>
                        </a>
                      </Space>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "15px"
                    }}>
                      {["Social Media Marketing", "Search Engine Optimization", "Web Design & Development", "Mobile App Development"].map((plugin, index) => (
                        <div key={index} style={{
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "10px",
                          padding: "20px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          backdropFilter: "blur(5px)",
                          height: "120px"
                        }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "18px"
                          }}>
                            {index % 4 === 0 ? <img src="Images/socialmedia.png" style={{ width: "40px", height: "40px" }} alt="Social Media Marketing" /> :
                              index % 4 === 1 ? <img src="Images/seo.png" style={{ width: "40px", height: "40px" }} alt="Search Engine Optimization" /> :
                                index % 4 === 2 ? <img src="Images/website.png" style={{ width: "40px", height: "40px" }} alt="Web Design & Development" /> : <img src="Images/mobile.png" style={{ width: "40px", height: "40px" }} alt="Mobile App Development" />}
                          </div>
                          <Text style={{ color: "#fff", fontSize: "14px", fontWeight: "500" }}>
                            {plugin}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              </div>
            </section> */}

                        {/* Our Partner Section */}
                        <section style={{
                            padding: "100px 0",
                            background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)",
                            position: "relative",
                            overflow: "hidden"
                        }}>
                            {/* Animated background elements */}
                            <div style={{
                                position: "absolute",
                                width: "300px",
                                height: "300px",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(65,105,225,0.08) 0%, rgba(0,0,0,0) 70%)",
                                top: "-50px",
                                left: "-100px",
                                zIndex: 0
                            }} />
                            <div style={{
                                position: "absolute",
                                width: "400px",
                                height: "400px",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(0,191,255,0.05) 0%, rgba(0,0,0,0) 70%)",
                                bottom: "-100px",
                                right: "-150px",
                                zIndex: 0
                            }} />

                            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", position: "relative", zIndex: 1 }}>
                                <div style={{
                                    textAlign: "center",
                                    marginBottom: "70px"
                                }}>
                                    <div style={{
                                        display: "inline-block",
                                        padding: "6px 16px",
                                        borderRadius: "30px",
                                        background: "rgba(65,105,225,0.1)",
                                        marginBottom: "20px"
                                    }}>
                                        <Text style={{ color: "#4169e1", fontSize: "14px", fontWeight: "500" }}>
                                            Trusted Partners
                                        </Text>
                                    </div>
                                    <Title level={2} style={{
                                        color: "#fff",
                                        textAlign: "center",
                                        fontSize: "42px",
                                        fontWeight: "700",
                                        letterSpacing: "-0.02em",
                                        marginBottom: "20px"
                                    }}>
                                        Our Partners
                                    </Title>
                                    <Text style={{
                                        color: "rgba(255,255,255,0.7)",
                                        fontSize: "18px",
                                        maxWidth: "600px",
                                        margin: "0 auto",
                                        lineHeight: "1.6"
                                    }}>
                                        We collaborate with industry leaders to deliver exceptional service and value
                                    </Text>
                                </div>

                                <div style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    justifyContent: "center",
                                    gap: "30px",
                                    padding: "0 10px"
                                }}>
                                    {[
                                        {
                                            name: "Pizeonfly",
                                            desc: "Website Design & Digital Marketing",
                                            color: "#4169e1",
                                            note: "Transforming businesses with stunning websites and effective digital marketing strategies. Specializing in custom web solutions and growth-driven campaigns."
                                        },
                                        {
                                            name: "A2Z Globix",
                                            desc: "Tour and Travel Services",
                                            color: "#00BFFF",
                                            note: "Your gateway to worldwide destinations. Offering personalized travel packages, corporate bookings, and exclusive international tour experiences."
                                        },
                                        {
                                            name: "First India Credit",
                                            desc: "Loan & Credit Services",
                                            color: "#f11a21",
                                            note: "Empowering individuals and businesses with accessible financial solutions. Providing personal loans, business credit, and specialized financial services."
                                        },
                                        // {
                                        //   name: "India Educates", 
                                        //   desc: "Educational Institute", 
                                        //   color: "#9C27B0",
                                        //   note: "Building tomorrow's leaders through quality education. A premier institute offering diverse courses, expert faculty, and comprehensive learning resources."
                                        // }
                                    ].map((company, index) => (
                                        <div key={index} style={{
                                            width: "330px",
                                            background: "rgba(19, 21, 26, 0.7)",
                                            borderRadius: "16px",
                                            overflow: "hidden",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                                            backdropFilter: "blur(10px)",
                                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                            ":hover": {
                                                transform: "translateY(-8px)",
                                                boxShadow: "0 30px 60px rgba(0,0,0,0.4)"
                                            }
                                        }}>
                                            <div style={{
                                                height: "160px",
                                                background: `linear-gradient(135deg, 0%, rgba(0,0,0,0.8) 100%)`,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                position: "relative",
                                                overflow: "hidden"
                                            }}>
                                                <div style={{
                                                    position: "absolute",
                                                    width: "120%",
                                                    height: "120%",
                                                    background: "white",
                                                    // background: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                                                    opacity: 0.1
                                                }} />

                                                {company.name === "Pizeonfly" ? (
                                                    <img
                                                        src="Images/pizeonfly.png"
                                                        alt="Pizeonfly"
                                                        style={{
                                                            maxWidth: "75%",
                                                            maxHeight: "75%",
                                                            objectFit: "contain",
                                                            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                                                        }}
                                                    />
                                                ) : company.name === "A2Z Globix" ? (
                                                    <img
                                                        src="Images/a2z.png"
                                                        alt="A2Z Globix"
                                                        style={{
                                                            maxWidth: "75%",
                                                            maxHeight: "75%",
                                                            objectFit: "contain",
                                                            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                                                        }}
                                                    />
                                                ) : company.name === "First India Credit" ? (
                                                    <img
                                                        src="Images/fic.png"
                                                        alt="First India Credit"
                                                        style={{
                                                            maxWidth: "75%",
                                                            maxHeight: "75%",
                                                            objectFit: "contain",
                                                            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                                                        }}
                                                    />
                                                ) : (
                                                    <Text style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>
                                                        {/* {company.name} */}
                                                    </Text>
                                                )}
                                            </div>

                                            <div style={{ padding: "25px" }}>
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    marginBottom: "10px",
                                                    gap: "6px"
                                                }}>
                                                    <div style={{
                                                        width: "8px",
                                                        height: "8px",
                                                        borderRadius: "50%",
                                                        background: company.color
                                                    }}></div>
                                                    <Text style={{
                                                        color: "#fff",
                                                        fontWeight: "600",
                                                        fontSize: "18px"
                                                    }}>
                                                        {company.name}
                                                    </Text>
                                                </div>
                                                <Text style={{
                                                    color: company.color,
                                                    fontSize: "14px",
                                                    fontWeight: "500",
                                                    display: "block",
                                                    marginBottom: "12px",
                                                    opacity: 0.9
                                                }}>
                                                    {company.desc}
                                                </Text>
                                                <Text style={{
                                                    color: "rgba(255,255,255,0.7)",
                                                    fontSize: "14px",
                                                    display: "block",
                                                    marginBottom: "22px",
                                                    lineHeight: "1.6"
                                                }}>
                                                    {company.note}
                                                </Text>
                                                <Button
                                                    type="default"
                                                    href={company.name === "Pizeonfly" ? "https://pizeonfly.com" :
                                                        company.name === "A2Z Globix" ? "https://a2zglobix.com" :
                                                            company.name === "First India Credit" ? "https://firstindiacredit.com" :
                                                                "https://indiaeducates.com"}
                                                    target="_blank"
                                                    style={{
                                                        width: "100%",
                                                        background: `linear-gradient(to right, ${company.color}22, ${company.color}44)`,
                                                        borderColor: `${company.color}66`,
                                                        color: "#fff",
                                                        height: "40px",
                                                        borderRadius: "8px",
                                                        fontWeight: "500",
                                                        transition: "all 0.3s ease"
                                                    }}
                                                >
                                                    Learn More
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Saved Connections Section */}
                        <section style={{
                            padding: "60px 0",
                            background: "#0a0a0a",
                            position: "relative"
                        }}>
                            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
                                <Title level={2} style={{ color: "white", marginBottom: 40, textAlign: "center" }}>
                                    Saved Connections
                                </Title>

                                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 20 }}>
                                    {savedHosts.length > 0 ? (
                                        savedHosts.map((host, index) => (
                                            <Card
                                                key={host.machineId || index}
                                                style={{
                                                    width: 300,
                                                    background: "rgba(20, 20, 20, 0.8)",
                                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                                    borderRadius: 12
                                                }}
                                                headStyle={{ color: "white" }}
                                                title={
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span>{host.name}</span>
                                                        {host.permanentAccess && (
                                                            <Badge 
                                                                count="PA" 
                                                                style={{ 
                                                                    backgroundColor: '#00BFFF',
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold'
                                                                }} 
                                                                title="Permanent Access"
                                                            />
                                                        )}
                                                    </div>
                                                }
                                                actions={[
                                                    <Button
                                                        key="connect"
                                                        type="primary"
                                                        onClick={() => {
                                                            if (host.permanentAccess) {
                                                                showPermanentAccessModal(host);
                                                            } else {
                                                                connectToSavedHost(host);
                                                            }
                                                        }}
                                                    >
                                                        {host.permanentAccess ? 'Connect (PA)' : 'Connect'}
                                                    </Button>,
                                                    <Button
                                                        key="delete"
                                                        type="primary"
                                                        danger
                                                        onClick={() => deleteSavedHost(host.machineId)}
                                                    >
                                                        Delete
                                                    </Button>
                                                ]}
                                            >
                                                <p style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                                                    Last connected: {new Date(host.lastConnected).toLocaleDateString()}
                                                </p>
                                                {host.label && (
                                                    <p style={{ color: "rgba(0, 183, 255, 0.8)", fontSize: "14px", fontWeight: "500" }}>
                                                        Label: {host.label}
                                                    </p>
                                                )}
                                                <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", wordBreak: "break-all" }}>
                                                    Machine ID: {host.machineId ? host.machineId.substring(0, 8) + '...' : 'Unknown'}
                                                </p>
                                            </Card>
                                        ))
                                    ) : (
                                        <Empty
                                            description={<span style={{ color: "rgba(255, 255, 255, 0.5)" }}>No saved connections</span>}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        />
                                    )}
                                </div>

                                <div style={{ textAlign: "center", marginTop: 30 }}>
                                    <Space direction="vertical" size={16}>
                                        <Button
                                            type="primary"
                                            icon={<LockOutlined />}
                                            onClick={showConnectByPassword}
                                            style={{
                                                height: "50px",
                                                fontSize: "16px",
                                                padding: "0 30px",
                                                background: "rgba(0, 102, 255, 0.2)",
                                                borderColor: "rgba(0, 102, 255, 0.4)",
                                                color: "#0066FF"
                                            }}
                                        >
                                            Connect with Password
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<LinkOutlined />}
                                            onClick={() => showPermanentAccessModal()}
                                            style={{
                                                height: "50px",
                                                fontSize: "16px",
                                                padding: "0 30px",
                                                background: "rgba(0, 183, 255, 0.2)",
                                                borderColor: "rgba(0, 183, 255, 0.4)",
                                                color: "#00BFFF"
                                            }}
                                        >
                                            Connect with Permanent Access
                                        </Button>
                                    </Space>
                                </div>
                            </div>
                        </section>

                    </main>

                    {/* Footer */}
                    <footer style={{
                        background: "#050505",
                        color: "#fff",
                        padding: "40px 0 20px",
                        borderTop: "1px solid rgba(255,255,255,0.05)"
                    }}>
                        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
                            <Row gutter={[40, 40]} justify="space-between">
                                <Col xs={24} sm={12} md={6}>
                                    <div style={{ marginBottom: "20px" }}>
                                        <img src="Images/flydesk1.png" style={{ height: "40px" }} alt="FLYDESK" />

                                    </div>
                                    <Text style={{ color: "rgba(255,255,255,0.6)", display: "block", marginBottom: "15px", lineHeight: "1.6" }}>
                                        The most reliable remote desktop solution for professionals.
                                    </Text>
                                </Col>

                                {["Product", "Resources", "Company"].map((category, index) => (
                                    <Col key={index} xs={24} sm={12} md={5}>
                                        <Title level={5} style={{ color: "#fff", marginBottom: "20px", fontSize: "16px" }}>
                                            {category}
                                        </Title>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            {["Features", "Pricing", "Security", "Support", "Contact"].map((item, i) => (
                                                <a key={i} href="#" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "14px" }}>
                                                    {item}
                                                </a>
                                            )).slice(0, 4)}
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "30px 0 20px" }} />

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                                    FLYDESK ©{new Date().getFullYear()} | All Rights Reserved
                                </Text>
                                <div>
                                    <Space split={<Divider type="vertical" style={{ borderColor: "rgba(255,255,255,0.1)" }} />}>
                                        <a href="#" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "13px" }}>Terms</a>
                                        <a href="#" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "13px" }}>Privacy</a>
                                        <a href="https://pizeonfly.com" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "13px" }}>
                                            Powered by Pizeonfly
                                        </a>
                                    </Space>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            )}

            {/* Custom Ant Design Dark Modal */}
            <ConfigProvider
                theme={{
                    components: {
                        Modal: {
                            contentBg: '#1a1a1a',
                            headerBg: '#1a1a1a',
                            titleColor: 'rgba(255,255,255,0.85)',
                            footerBg: '#1a1a1a',
                        },
                        Input: {
                            colorBgContainer: '#2a2a2a',
                            colorBorder: '#444',
                            colorText: 'white',
                        },
                        Button: {
                            defaultColor: 'rgba(255,255,255,0.65)',
                            defaultBg: '#2a2a2a',
                            defaultBorderColor: '#444'
                        }
                    },
                }}
            >
                <Modal
                    title="Enter Session Code"
                    open={codeInputVisible}
                    onCancel={() => setCodeInputVisible(false)}
                    centered
                    closeIcon={<CloseOutlined style={{ color: "rgba(255,255,255,0.65)" }} />}
                    footer={[
                        <Button key="cancel" onClick={() => setCodeInputVisible(false)}>
                            Cancel
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            onClick={handleCodeSubmit}
                            style={{ background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)", borderColor: "transparent" }}
                        >
                            Connect
                        </Button>
                    ]}
                    styles={{
                        mask: { backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.45)' },
                        content: {
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            border: '1px solid #333'
                        },
                        header: { borderBottom: '1px solid #333' },
                        footer: { borderTop: '1px solid #333' },
                        body: { padding: '24px' }
                    }}
                >
                    <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                        <Input
                            placeholder="6-digit code"
                            maxLength={6}
                            size="large"
                            style={{
                                width: "100%",
                                textAlign: "center",
                                letterSpacing: "0.5em",
                                fontSize: "24px",
                                marginBottom: "16px",
                                padding: "10px 12px",
                            }}
                            value={sessionCode}
                            onChange={(e) => setSessionCode(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                        <Text style={{ display: "block", textAlign: "center", color: "rgba(255,255,255,0.45)" }}>
                            Enter the 6-digit code provided by the host
                        </Text>
                        
                        {/* Divider */}
                        <Divider style={{ 
                            margin: '24px 0', 
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderStyle: 'solid'
                        }} />
                        
                        {/* Connect to Saved Computers Section */}
                        <div style={{ marginBottom: '16px' }}>
                            <Text style={{ 
                                display: "block", 
                                color: "rgba(255,255,255,0.85)", 
                                fontSize: "16px",
                                fontWeight: "500",
                                marginBottom: "16px"
                            }}>
                                Connect to Saved Computers
                            </Text>
                            
                            {savedHosts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {savedHosts.map((host, index) => (
                                        <div
                                            key={host.machineId || index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                ':hover': {
                                                    background: 'rgba(255,255,255,0.08)',
                                                    borderColor: 'rgba(255,255,255,0.2)'
                                                }
                                            }}
                                            onClick={() => {
                                                if (host.permanentAccess) {
                                                    showPermanentAccessModal(host);
                                                } else {
                                                    connectToSavedHost(host);
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    background: host.permanentAccess ? 'rgba(0,183,255,0.2)' : 'rgba(0,183,255,0.2)',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: host.permanentAccess ? '#00BFFF' : '#00BFFF'
                                                }}>
                                                    <LaptopOutlined style={{ fontSize: '16px' }} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Text style={{ 
                                                            color: 'rgba(255,255,255,0.85)', 
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            display: 'block'
                                                        }}>
                                                            {host.name}
                                                        </Text>
                                                        {host.permanentAccess && (
                                                            <Badge 
                                                                count="PA" 
                                                                style={{ 
                                                                    backgroundColor: '#00BFFF',
                                                                    fontSize: '8px',
                                                                    fontWeight: 'bold'
                                                                }} 
                                                                title="Permanent Access"
                                                            />
                                                        )}
                                                    </div>
                                                    <Text style={{ 
                                                        color: 'rgba(255,255,255,0.45)', 
                                                        fontSize: '12px',
                                                        display: 'block'
                                                    }}>
                                                        Last connected: {new Date(host.lastConnected).toLocaleDateString()}
                                                    </Text>
                                                    {host.label && (
                                                        <Text style={{ 
                                                            color: 'rgba(0,183,255,0.8)', 
                                                            fontSize: '11px',
                                                            display: 'block'
                                                        }}>
                                                            Label: {host.label}
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSavedHost(host.machineId);
                                                }}
                                                style={{
                                                    color: 'rgba(255,255,255,0.45)',
                                                    ':hover': {
                                                        color: '#ff4d4f'
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '24px 16px',
                                    color: 'rgba(255,255,255,0.45)'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '12px'
                                    }}>
                                        <LaptopOutlined style={{ fontSize: '24px' }} />
                                    </div>
                                    <Text style={{ fontSize: '14px' }}>
                                        No saved computers yet
                                    </Text>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            </ConfigProvider>

            <Modal
                title={null}
                open={videoModalVisible}
                onCancel={closeVideoModal}
                footer={null}
                centered
                width="80%"
                closeIcon={<CloseOutlined style={{ color: "rgba(255,255,255,0.65)" }} />}
                styles={{
                    mask: { backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.75)' },
                    content: {
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        border: '1px solid #333',
                        background: '#000',
                        padding: '0'
                    },
                    body: { padding: '0' }
                }}
            >
                <div style={{
                    position: "relative",
                    width: "100%",
                    height: "0",
                    paddingBottom: "56.25%", // 16:9 aspect ratio
                    overflow: "hidden"
                }}>
                    <video
                        src="Images/video.mp4"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                            position: "absolute",
                            top: "0",
                            left: "0",
                            width: "100%",
                            height: "100%",
                            objectFit: "contain"
                        }}
                    />
                </div>
            </Modal>

            <Modal
                title="Session Recording"
                open={recordingModalVisible}
                onCancel={closeRecordingModal}
                footer={[
                    <Button key="close" onClick={closeRecordingModal}>
                        Close
                    </Button>,
                    <Button
                        key="download"
                        type="primary"
                        href={recordedVideo}
                        download="flydesk-recording.webm"
                    >
                        Download Recording
                    </Button>
                ]}
                width={800}
            >
                {recordedVideo && (
                    <div>
                        <p>Your session recording is ready. You can preview it below or download it to your device.</p>
                        <div style={{ marginTop: '20px' }}>
                            <video
                                src={recordedVideo}
                                controls
                                style={{ width: '100%', borderRadius: '8px' }}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Password Connection Modal */}
            <Modal
                title="Connect with Password"
                open={connectByPasswordVisible}
                onCancel={() => setConnectByPasswordVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setConnectByPasswordVisible(false)}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handlePasswordConnect}>
                        Connect
                    </Button>
                ]}
                centered
            >
                <div style={{ padding: "20px 0" }}>
                    <Input
                        placeholder="Machine ID"
                        value={machineIdInput}
                        onChange={(e) => setMachineIdInput(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Input.Password
                        placeholder="Access Password"
                        value={hostPassword}
                        onChange={(e) => setHostPassword(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Text type="secondary">
                        Enter the machine ID and password provided by the host.
                    </Text>
                </div>
            </Modal>

            {/* Permanent Access Modal */}
            <Modal
                title="Connect with Permanent Access"
                open={permanentAccessModalVisible}
                onCancel={() => setPermanentAccessModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setPermanentAccessModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handlePermanentAccessConnect}>
                        Connect
                    </Button>
                ]}
                centered
            >
                <div style={{ padding: "20px 0" }}>
                    <Input
                        placeholder="Machine ID"
                        value={permanentAccessMachineId}
                        onChange={(e) => setPermanentAccessMachineId(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Input
                        placeholder="Label (e.g., My Phone, Work Laptop)"
                        value={permanentAccessLabel}
                        onChange={(e) => setPermanentAccessLabel(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Input.Password
                        placeholder="Access Password"
                        value={permanentAccessPassword}
                        onChange={(e) => setPermanentAccessPassword(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />
                    <Text type="secondary">
                        Enter the machine ID, label, and password for permanent access. This will allow you to connect without approval in the future.
                    </Text>
                </div>
            </Modal>
        </div>
    );
}

export default Main;
