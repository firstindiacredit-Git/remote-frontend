// import { useEffect, useRef, useState } from "react";
// import io from "socket.io-client";
// import 'antd/dist/reset.css';
// import {
//   Layout,
//   Button,
//   Typography,
//   Divider,
//   Space,
//   Badge,
//   Row,
//   Col,
//   Input,
//   Modal,
//   message,
//   Alert,
//   ConfigProvider
// } from "antd";
// import {
//   DesktopOutlined,
//   PoweroffOutlined,
//   LinkOutlined,
//   DownloadOutlined,
//   CloseCircleOutlined,
//   LaptopOutlined,
//   CloseOutlined
// } from "@ant-design/icons";

// const { Header, Content, Footer } = Layout;
// const { Title, Text, Paragraph } = Typography;

// // Create socket with reconnection options
// const socket = io(
//   "https://flydesk.pizeonfly.com",
//   {
//     reconnection: true,
//     reconnectionAttempts: Infinity,
//     reconnectionDelay: 1000,
//     reconnectionDelayMax: 5000,
//     timeout: 20000
//   });

// function App() {
//   const canvasRef = useRef(null);
//   const [hostId, setHostId] = useState("");
//   const [availableHosts, setAvailableHosts] = useState([]);
//   const [connected, setConnected] = useState(false);
//   const [keyboardActive, setKeyboardActive] = useState(false);
//   const [connectionStatus, setConnectionStatus] = useState("Connecting...");
//   const [modifierKeys, setModifierKeys] = useState({
//     shift: false,
//     control: false,
//     alt: false,
//     meta: false,
//     capsLock: false
//   });
//   const [fullScreenMode, setFullScreenMode] = useState(false);
//   const [currentHostInfo, setCurrentHostInfo] = useState(null);
//   const [sessionCode, setSessionCode] = useState("");
//   const [codeInputVisible, setCodeInputVisible] = useState(false);
//   const [pendingConnection, setPendingConnection] = useState(false);
//   const [pendingHostInfo, setPendingHostInfo] = useState(null);
//   const [videoModalVisible, setVideoModalVisible] = useState(false);

//   useEffect(() => {
//     // Socket connection listeners
//     socket.on("connect", () => {
//       setConnectionStatus("Connected");

//       if (hostId) {
//         socket.emit("connect-to-host", hostId);
//         socket.emit("request-screen", {
//           to: hostId,
//           from: socket.id
//         });
//       }
//     });

//     socket.on("disconnect", (reason) => {
//       setConnectionStatus(`Disconnected: ${reason}. Reconnecting...`);
//     });

//     socket.io.on("reconnect_attempt", (attempt) => {
//       setConnectionStatus(`Reconnecting... (attempt ${attempt})`);
//     });

//     socket.io.on("reconnect", () => {
//       setConnectionStatus("Reconnected!");
//       setTimeout(() => {
//         setConnectionStatus("Connected");
//       }, 2000);
//     });

//     // Keep-alive ping
//     const pingInterval = setInterval(() => {
//       if (socket.connected) {
//         socket.emit("keep-alive");
//       }
//     }, 15000);

//     // Host availability handler
//     socket.on("host-available", (hostInfo) => {
//       setAvailableHosts(prev => {
//         const exists = prev.some(host => host.id === hostInfo.id);
//         if (exists) {
//           return prev.map(host =>
//             host.id === hostInfo.id ? hostInfo : host
//           );
//         } else {
//           return [...prev, hostInfo];
//         }
//       });
//     });

//     // Screen data handler
//     socket.on("screen-data", (data) => {
//       if (!canvasRef.current) return;

//       const img = new Image();
//       img.onload = () => {
//         const ctx = canvasRef.current.getContext('2d');
//         ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
//       };
//       img.src = data.imageData;
//     });

//     // Key event handlers
//     const handleKeyDown = (e) => {
//       if (!hostId) return;

//       // Track modifier keys
//       if (e.key === 'Shift') setModifierKeys(prev => ({ ...prev, shift: true }));
//       else if (e.key === 'Control') setModifierKeys(prev => ({ ...prev, control: true }));
//       else if (e.key === 'Alt') setModifierKeys(prev => ({ ...prev, alt: true }));
//       else if (e.key === 'Meta') setModifierKeys(prev => ({ ...prev, meta: true }));
//       else if (e.key === 'CapsLock') setModifierKeys(prev => ({ ...prev, capsLock: !prev.capsLock }));

//       e.preventDefault();

//       socket.emit("remote-key-event", {
//         to: hostId,
//         type: "down",
//         key: e.key,
//         code: e.code,
//         keyCode: e.keyCode,
//         modifiers: {
//           shift: e.shiftKey,
//           control: e.ctrlKey,
//           alt: e.altKey,
//           meta: e.metaKey,
//           capsLock: e.getModifierState('CapsLock')
//         }
//       });
//     };

//     const handleKeyUp = (e) => {
//       if (!hostId) return;

//       // Update modifier key states
//       if (e.key === 'Shift') setModifierKeys(prev => ({ ...prev, shift: false }));
//       else if (e.key === 'Control') setModifierKeys(prev => ({ ...prev, control: false }));
//       else if (e.key === 'Alt') setModifierKeys(prev => ({ ...prev, alt: false }));
//       else if (e.key === 'Meta') setModifierKeys(prev => ({ ...prev, meta: false }));

//       e.preventDefault();

//       socket.emit("remote-key-event", {
//         to: hostId,
//         type: "up",
//         key: e.key,
//         code: e.code,
//         keyCode: e.keyCode,
//         modifiers: {
//           shift: e.shiftKey,
//           control: e.ctrlKey,
//           alt: e.altKey,
//           meta: e.metaKey,
//           capsLock: e.getModifierState('CapsLock')
//         }
//       });
//     };

//     // Add keyboard listeners
//     document.addEventListener('keydown', handleKeyDown);
//     document.addEventListener('keyup', handleKeyUp);

//     // Connection handlers
//     socket.on("host-disconnect-ack", () => {
//       setHostId("");
//       setConnected(false);
//       setKeyboardActive(false);
//     });

//     socket.on("code-accepted", (hostInfo) => {
//       message.success("Code accepted! Waiting for host approval...");
//       setPendingConnection(true);
//       setPendingHostInfo(hostInfo);
//     });

//     socket.on("code-rejected", (data) => {
//       message.error(data.message || "Invalid session code");
//       setPendingConnection(false);
//     });

//     socket.on("connection-accepted", (hostInfo) => {
//       message.success("Connection approved by host!");
//       setPendingConnection(false);

//       setHostId(hostInfo.hostId);
//       setConnected(true);
//       setFullScreenMode(true);
//       setCurrentHostInfo({
//         id: hostInfo.hostId,
//         name: hostInfo.hostName
//       });

//       socket.emit("connect-to-host", hostInfo.hostId);
//       socket.emit("request-screen", {
//         to: hostInfo.hostId,
//         from: socket.id
//       });

//       setKeyboardActive(true);
//     });

//     socket.on("connection-rejected", () => {
//       message.error("Connection rejected by host");
//       setPendingConnection(false);
//       setPendingHostInfo(null);
//     });

//     return () => {
//       // Cleanup
//       socket.off("host-available");
//       socket.off("screen-data");
//       socket.off("connect");
//       socket.off("disconnect");
//       socket.io.off("reconnect_attempt");
//       socket.io.off("reconnect");
//       document.removeEventListener('keydown', handleKeyDown);
//       document.removeEventListener('keyup', handleKeyUp);
//       clearInterval(pingInterval);
//     };
//   }, [hostId, modifierKeys]);

//   const connectToHost = (hostInfo) => {
//     setHostId(hostInfo.id);
//     setConnected(true);
//     setFullScreenMode(true);
//     setCurrentHostInfo(hostInfo);

//     socket.emit("connect-to-host", hostInfo.id);
//     socket.emit("request-screen", {
//       to: hostInfo.id,
//       from: socket.id
//     });

//     setKeyboardActive(true);
//   };

//   // Mouse handlers
//   const handleMouseMove = (e) => {
//     if (!hostId) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;

//     const scaledX = x * scaleX;
//     const scaledY = y * scaleY;

//     socket.emit("remote-mouse-move", {
//       to: hostId,
//       x: scaledX,
//       y: scaledY,
//       screenWidth: canvasRef.current.width,
//       screenHeight: canvasRef.current.height
//     });
//   };

//   const handleMouseClick = (e) => {
//     e.preventDefault();
//     if (!hostId) return;

//     let button = "left";
//     if (e.button === 1) button = "middle";
//     if (e.button === 2) button = "right";

//     socket.emit("remote-mouse-click", {
//       to: hostId,
//       button: button
//     });
//   };

//   const handleContextMenu = (e) => {
//     e.preventDefault();
//     return false;
//   };

//   const handleMouseWheel = (e) => {
//     if (!hostId) return;
//     e.preventDefault();

//     const delta = e.deltaY || e.detail || e.wheelDelta;

//     socket.emit("remote-mouse-scroll", {
//       to: hostId,
//       deltaY: delta
//     });
//   };

//   const handleDisconnect = () => {
//     if (hostId) {
//       socket.emit("client-disconnect-request", {
//         from: socket.id,
//         to: hostId
//       });

//       setTimeout(() => {
//         setHostId("");
//         setConnected(false);
//         setKeyboardActive(false);
//         setCurrentHostInfo(null);
//       }, 500);
//     }
//     setFullScreenMode(false);
//   };

//   const showCodeInput = () => {
//     setCodeInputVisible(true);
//   };

//   const handleCodeSubmit = () => {
//     if (!sessionCode || sessionCode.length !== 6) {
//       message.error("Please enter a valid 6-digit code");
//       return;
//     }

//     socket.emit("connect-with-code", { code: sessionCode });
//     setCodeInputVisible(false);
//   };

//   const showVideoModal = () => {
//     setVideoModalVisible(true);
//   };

//   const closeVideoModal = () => {
//     setVideoModalVisible(false);
//   };

//   return (
//     <div style={{ height: '100vh' }}>
//       {fullScreenMode ? (
//         // Fullscreen mode when connected to a host
//         <div style={{
//           width: '100%',
//           height: '100%',
//           display: 'flex',
//           flexDirection: 'column',
//           background: '#000'
//         }}>
//           <div style={{
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             padding: '8px 16px',
//             background: 'rgba(0, 0, 0, 0.8)'
//           }}>
//             <Space>
//               <Badge status="processing" />
//               <Text style={{ color: 'white' }} strong>
//                 Connected to: {currentHostInfo ? currentHostInfo.name : `Host ${hostId.substring(0, 8)}`}
//               </Text>
//             </Space>

//               <Button
//                 type="primary"
//                 danger
//                 icon={<CloseCircleOutlined />}
//                 onClick={handleDisconnect}
//                 size="small"
//               >
//                 Exit
//               </Button>
//           </div>

//           <div style={{
//             flex: 1,
//             display: 'flex',
//             justifyContent: 'center',
//             alignItems: 'center',
//             background: '#000',
//             position: 'relative'
//           }}>
//             <canvas
//               ref={canvasRef}
//               width="1580"
//               height="720"
//               onMouseMove={handleMouseMove}
//               onMouseDown={handleMouseClick}
//               onContextMenu={handleContextMenu}
//               onWheel={handleMouseWheel}
//               style={{
//                 width: 'auto',
//                 height: 'auto',
//                 maxWidth: '100%',
//                 maxHeight: 'calc(100vh - 50px)'
//               }}
//             />
//           </div>
//         </div>
//       ) : (
//         // Modern layout without using Card components
//         <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
//           {/* Modern Header */}
//           <header style={{
//             background: "linear-gradient(90deg, #121211 0%, #1a1a1a 100%)",
//             boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
//             padding: "12px 24px",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             position: "sticky",
//             top: 0,
//             zIndex: 10
//           }}>
//             <div>
//               <img src="Images/flydesk1.png" style={{ width: "30vh", height: "50px" }} alt="FLYDESK" />
//             </div>

//             <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
//               <div style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 backgroundColor: "rgba(255,255,255,0.05)",
//                 padding: "6px 10px",
//                 borderRadius: "4px"
//               }}>
//                 <span style={{
//                   width: "8px",
//                   height: "8px",
//                   borderRadius: "50%",
//                   backgroundColor: connectionStatus.includes("Connected") ? "#52c41a" :
//                     connectionStatus.includes("Reconnecting") ? "#faad14" : "#f5222d",
//                 }}></span>
//                 <Text style={{ color: "white", margin: 0 }}>{connectionStatus}</Text>
//               </div>

//               <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/RemoteDeskApp+Setup+1.0.0.exe">
//               <Button
//                 type="primary"
//                 icon={<DownloadOutlined />}
//                 style={{
//                     height: "40px",
//                     padding: "0 15px",
//                     borderRadius: "6px",
//                     fontWeight: 500,
//                     boxShadow: "0 2px 0 rgba(0,0,0,0.045)"
//                   }}
//                 >
//                   Download FLYDESK App
//               </Button>
//               </a>
//             </div>
//           </header>

//           {/* Main Content Area with Hero Section */}
//           <main style={{ flex: 1 }}>
//             {/* Hero Section */}
//             <section style={{
//               backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
//               padding: "70px 20px",
//               textAlign: "center",
//               color: "white",
//               position: "relative",
//               overflow: "hidden"
//             }}>
//               {/* Background effects */}
//               <div style={{
//                 position: "absolute",
//                 top: "10%",
//                 left: "5%",
//                 width: "300px",
//                 height: "300px",
//                 borderRadius: "50%",
//                 background: "radial-gradient(circle, rgba(66,99,235,0.1) 0%, rgba(66,99,235,0) 70%)",
//                 zIndex: 0
//               }}></div>
//               <div style={{
//                 position: "absolute",
//                 bottom: "10%",
//                 right: "8%",
//                 width: "250px",
//                 height: "250px",
//                 borderRadius: "50%",
//                 background: "radial-gradient(circle, rgba(66,99,235,0.1) 0%, rgba(66,99,235,0) 70%)",
//                 zIndex: 0
//               }}></div>

//               <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
//                 <Title level={1} style={{
//                   color: "white",
//                   fontSize: "3rem",
//                   marginBottom: "20px",
//                   fontWeight: "600",
//                   textShadow: "0 2px 4px rgba(0,0,0,0.3)"
//                 }}>
//                   Remote Control Made Simple
//                 </Title>
//                 <Paragraph style={{
//                   fontSize: "1.2rem",
//                   color: "rgba(255,255,255,0.9)",
//                   maxWidth: "600px",
//                   margin: "0 auto 30px",
//                   lineHeight: "1.6"
//                 }}>
//                   Connect securely to any computer anywhere in the world with FLYDESK's powerful remote desktop solution.
//                 </Paragraph>

//                 <div style={{
//                   background: "rgba(255,255,255,0.05)",
//                   backdropFilter: "blur(10px)",
//                   borderRadius: "12px",
//                   padding: "40px",
//                   maxWidth: "500px",
//                   margin: "30px auto",
//                   boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
//                   border: "1px solid rgba(255,255,255,0.1)"
//                 }}>
//                   <Title level={3} style={{ color: "white", marginBottom: "25px" }}>
//                   <Space>
//                     <LinkOutlined />
//                     Connect to Remote Desktop
//                   </Space>
//                 </Title>

//                   <Paragraph style={{ color: "rgba(255,255,255,0.8)", marginBottom: "25px" }}>
//                     Enter the 6-digit session code provided by the host computer
//                   </Paragraph>

//                   <Button
//                     type="primary"
//                     size="large"
//                     icon={<LinkOutlined />}
//                     onClick={showCodeInput}
//                     style={{
//                       height: "48px",
//                       fontSize: "16px",
//                       fontWeight: "500",
//                       padding: "0 30px",
//                       background: "#4263eb",
//                       borderColor: "#4263eb",
//                       borderRadius: "6px",
//                       boxShadow: "0 4px 12px rgba(66,99,235,0.3)"
//                     }}
//                   >
//                     Connect with Session Code
//                   </Button>

//                   {pendingConnection && pendingHostInfo && (
//                     <div style={{ marginTop: "24px" }}>
//                       <Alert
//                         message="Connection Request Pending"
//                         description={`Waiting for ${pendingHostInfo.hostName} to approve your connection...`}
//                         type="warning"
//                         showIcon
//                       />
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </section>

//             {/* Pizeonfly Advertisement Section */}
//             <section style={{
//               padding: "80px 0",
//               background: "linear-gradient(135deg, #4169e1 0%, #3b5fe2 100%)",
//               position: "relative",
//               overflow: "hidden"
//             }}>
//               {/* Decorative Elements */}
//               <div style={{
//                 position: "absolute",
//                 top: "-50px",
//                 left: "-50px",
//                 width: "200px",
//                 height: "200px",
//                 borderRadius: "50%",
//                 background: "rgba(255,255,255,0.05)",
//                 zIndex: 0
//               }}></div>
//               <div style={{
//                 position: "absolute",
//                 bottom: "-80px",
//                 right: "10%",
//                 width: "300px",
//                 height: "300px",
//                 borderRadius: "50%",
//                 background: "rgba(255,255,255,0.05)",
//                 zIndex: 0
//               }}></div>
//               <div style={{
//                 position: "absolute",
//                 top: "30%",
//                 right: "-50px",
//                 width: "150px",
//                 height: "150px",
//                 borderRadius: "50%",
//                 background: "rgba(255,255,255,0.05)",
//                 zIndex: 0
//               }}></div>

//               <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", position: "relative", zIndex: 1 }}>
//                 <Row gutter={[50, 40]} align="middle">
//                   <Col xs={24} md={12}>
//                     <div style={{ color: "#fff" }}>
//                       <Title level={2} style={{
//                         color: "#fff",
//                         marginBottom: "25px",
//                         fontSize: "38px",
//                         fontWeight: "600",
//                         lineHeight: "1.2"
//                       }}>
//                         Results Driven Website Design and Digital Marketing
//                       </Title>
//                       <Paragraph style={{
//                         fontSize: "18px",
//                         marginBottom: "30px",
//                         lineHeight: "1.7",
//                         color: "rgba(255, 255, 255, 0.9)"
//                       }}>
//                         At Pizeonfly, we don't just design websites, we build digital experiences
//                         that elevate your brand and drive lasting success. Our team of experts creates
//                         stunning websites that convert visitors into customers.
//                       </Paragraph>
//                       <Space size="large">
//                         {/* <Button
//                           type="primary"
//                           size="large"
//                           style={{
//                             background: "#ff5252",
//                             borderColor: "#ff5252",
//                             height: "50px",
//                             padding: "0 28px",
//                             fontSize: "16px",
//                             fontWeight: "500",
//                             borderRadius: "6px",
//                             boxShadow: "0 6px 16px rgba(255,82,82,0.3)"
//                           }}
//                         >
//                           Get My Free Proposal
//                         </Button> */}
//                         <a href="https://pizeonfly.com" target="_blank">
//                         <Button
//                           ghost
//                           size="large"
//                           style={{
//                             borderColor: "#fff",
//                             color: "#fff",
//                             height: "50px",
//                             padding: "0 28px",
//                             fontSize: "16px",
//                             fontWeight: "500",
//                             borderRadius: "6px"
//                           }}
//                         >
//                           Learn more
//                         </Button>
//                         </a>
//                 </Space>
//               </div>
//                   </Col>
//                   <Col xs={24} md={12}>
//                     <div style={{
//                       position: "relative",
//                       borderRadius: "12px",
//                       overflow: "hidden",
//                       // boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
//                       // transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)",
//                       // transition: "all 0.5s ease"
//                     }}>
//                       <img
//                         src="Images/pizeonfly.png"
//                         alt="Pizeonfly Digital Agency"
//                         style={{
//                           width: "100%",
//                           display: "block",
//                           // transform: "scale(1.02)"
//                         }}
//                       />

//                       {/* Overlay gradient */}
//                       <div style={{
//                         position: "absolute",
//                         top: 0,
//                         left: 0,
//                         right: 0,
//                         bottom: 0,
//                         background: "linear-gradient(135deg, rgba(66,99,235,0.2) 0%, rgba(255,82,82,0.1) 100%)",
//                         pointerEvents: "none"
//                       }}></div>
//                     </div>
//                   </Col>
//                 </Row>

//                 {/* Stats Section */}
//                 <div style={{
//                   marginTop: "70px",
//                   background: "rgba(255,255,255,0.05)",
//                   borderRadius: "12px",
//                   padding: "30px",
//                   backdropFilter: "blur(5px)",
//                   border: "1px solid rgba(255,255,255,0.1)",
//                   boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
//                 }}>
//                   <Row gutter={[20, 30]} justify="space-around">
//                     <Col xs={24} sm={8} style={{ textAlign: "center" }}>
//                       <div style={{
//                         display: "inline-flex",
//                         flexDirection: "column",
//                         alignItems: "center"
//                       }}>
//                         <Text style={{
//                           fontSize: "48px",
//                           fontWeight: "700",
//                           color: "#fff",
//                           lineHeight: "1"
//                         }}>200+</Text>
//                         <Text style={{
//                           color: "rgba(255,255,255,0.9)",
//                           fontSize: "16px",
//                           marginTop: "5px"
//                         }}>Happy Clients</Text>
//                       </div>
//                     </Col>
//                     <Col xs={24} sm={8} style={{ textAlign: "center" }}>
//                       <div style={{
//                         display: "inline-flex",
//                         flexDirection: "column",
//                         alignItems: "center"
//                       }}>
//                         <Text style={{
//                           fontSize: "48px",
//                           fontWeight: "700",
//                           color: "#fff",
//                           lineHeight: "1"
//                         }}>98%</Text>
//                         <Text style={{
//                           color: "rgba(255,255,255,0.9)",
//                           fontSize: "16px",
//                           marginTop: "5px"
//                         }}>Client Satisfaction</Text>
//                       </div>
//                     </Col>
//                     <Col xs={24} sm={8} style={{ textAlign: "center" }}>
//                       <div style={{
//                         display: "inline-flex",
//                         flexDirection: "column",
//                         alignItems: "center"
//                       }}>
//                         <Text style={{
//                           fontSize: "48px",
//                           fontWeight: "700",
//                           color: "#fff",
//                           lineHeight: "1"
//                         }}>10+</Text>
//                         <Text style={{
//                           color: "rgba(255,255,255,0.9)",
//                           fontSize: "16px",
//                           marginTop: "5px"
//                         }}>Years of Experience</Text>
//                       </div>
//                     </Col>
//                   </Row>
//                 </div>
//               </div>
//             </section>

//             {/* Features Section */}
//             {/* <section style={{
//               padding: "70px 20px",
//               background: "#f7f9fc"
//             }}>
//               <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
//                 <Title level={2} style={{ textAlign: "center", marginBottom: "50px", color: "#222" }}>
//                   Why Choose FLYDESK?
//                 </Title>

//                 <Row gutter={[30, 40]}>
//                   <Col xs={24} md={8}>
//                     <div style={{
//                       background: "#fff",
//                       borderRadius: "10px",
//                       padding: "30px",
//                       height: "100%",
//                       boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
//                       transition: "transform 0.3s ease, box-shadow 0.3s ease",
//                       cursor: "pointer"
//                     }}>
//                       <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
//                         <LaptopOutlined />
//                       </div>
//                       <Title level={4}>Secure Connection</Title>
//                       <Text style={{ color: "#666" }}>
//                         End-to-end encrypted connections ensure your remote sessions remain private and secure.
//                       </Text>
//                     </div>
//                   </Col>

//                   <Col xs={24} md={8}>
//                     <div style={{
//                       background: "#fff",
//                       borderRadius: "10px",
//                       padding: "30px",
//                       height: "100%",
//                       boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
//                       transition: "transform 0.3s ease, box-shadow 0.3s ease",
//                       cursor: "pointer"
//                     }}>
//                       <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
//                         <PoweroffOutlined />
//                       </div>
//                       <Title level={4}>Low Latency</Title>
//                       <Text style={{ color: "#666" }}>
//                         Experience smooth, responsive remote control with our optimized connection technology.
//                       </Text>
//                     </div>
//                   </Col>

//                   <Col xs={24} md={8}>
//                     <div style={{
//                       background: "#fff",
//                       borderRadius: "10px",
//                       padding: "30px",
//                       height: "100%",
//                       boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
//                       transition: "transform 0.3s ease, box-shadow 0.3s ease",
//                       cursor: "pointer"
//                     }}>
//                       <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
//                         <DesktopOutlined />
//                       </div>
//                       <Title level={4}>Cross Platform</Title>
//                       <Text style={{ color: "#666" }}>
//                         Connect from any device to any computer, regardless of operating system.
//                       </Text>
//                     </div>
//                   </Col>
//                 </Row>
//               </div>
//             </section> */}
//           </main>

//           {/* Modern Footer */}
//           <footer style={{
//             background: "#121211",
//             color: "#fff",
//             padding: "20px 0",
//             borderTop: "1px solid rgba(255,255,255,0.05)"
//           }}>
//             <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
//               <Row gutter={[30, 20]} justify="space-between" align="middle">
//                 <Col xs={24} sm={12}>
//                   <div style={{ display: "flex", alignItems: "center" }}>
//                     <img src="Images/flydesk1.png" style={{ height: "40px" }} alt="FLYDESK" />
//                   </div>
//                   <Text style={{ color: "rgba(255,255,255,0.7)", display: "block", marginTop: "10px" }}>
//                     The most reliable remote desktop solution for professionals.
//                   </Text>
//                 </Col>
//                 <Col xs={24} sm={12} style={{ textAlign: "right" }}>
//                   <Space split={<Divider type="vertical" style={{ borderColor: "rgba(255,255,255,0.2)" }} />}>
//                     <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Terms</a>
//                     <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Privacy</a>
//                     <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Support</a>
//                   </Space>
//                 </Col>
//               </Row>

//               <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "15px 0" }} />

//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
//                 <Text style={{ color: "rgba(255,255,255,0.5)" }}>
//                   FLYDESK ©{new Date().getFullYear()} | All Rights Reserved
//                 </Text>
//                 <div>
//                   <Space size="large">
//                     <a href="https://pizeonfly.com" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "13px" }}>
//                       Powered by Pizeonfly
//                     </a>
//                   </Space>
//                 </div>
//               </div>
//             </div>
//           </footer>
//         </div>
//       )}

//                  {/* Custom Ant Design Dark Modal */}
//       <ConfigProvider
//         theme={{
//           components: {
//             Modal: {
//               contentBg: '#1f1f1f',
//               headerBg: '#1f1f1f',
//               titleColor: 'rgba(255,255,255,0.85)',
//               footerBg: '#1f1f1f',
//             },
//             Input: {
//               colorBgContainer: '#2a2a2a',
//               colorBorder: '#444',
//               colorText: 'white',
//             },
//             Button: {
//               defaultColor: 'rgba(255,255,255,0.65)',
//               defaultBg: '#2a2a2a',
//               defaultBorderColor: '#444'
//             }
//           },
//         }}
//       >
//         <Modal
//           title="Enter Session Code"
//           open={codeInputVisible}
//           onCancel={() => setCodeInputVisible(false)}
//           centered
//           closeIcon={<CloseOutlined style={{ color: "rgba(255,255,255,0.65)" }} />}
//           footer={[
//             <Button key="cancel" onClick={() => setCodeInputVisible(false)}>
//               Cancel
//             </Button>,
//             <Button 
//               key="submit" 
//               type="primary" 
//               onClick={handleCodeSubmit}
//               style={{ background: "#4169e1", borderColor: "#4169e1", marginTop: "10px" }}
//             >
//               Connect
//             </Button>
//           ]}
//           styles={{
//             mask: { backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.45)' },
//             content: { 
//               borderRadius: '8px',
//               boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
//               border: '1px solid #333'
//             },
//             header: { borderBottom: '1px solid #333' },
//             footer: { borderTop: '1px solid #333' },
//             body: { padding: '24px' }
//           }}
//         >
//           <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
//             <Input
//               placeholder="6-digit code"
//               maxLength={6}
//               size="large"
//               style={{ 
//                 width: "100%", 
//                 textAlign: "center", 
//                 letterSpacing: "0.5em", 
//                 fontSize: "24px",
//                 marginBottom: "16px",
//                 padding: "10px 12px",
//               }}
//               value={sessionCode}
//               onChange={(e) => setSessionCode(e.target.value.replace(/[^0-9]/g, ''))}
//             />
//             <Text style={{ display: "block", textAlign: "center", color: "rgba(255,255,255,0.45)" }}>
//               Enter the 6-digit code provided by the host
//             </Text>
//           </div>
//         </Modal>
//       </ConfigProvider>
//     </div>
//   );
// }

// export default App;

import { useEffect, useRef, useState } from "react";
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
  ConfigProvider
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
  EyeOutlined
} from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

// Create socket with reconnection options
const socket = io(
  "https://flydesk.pizeonfly.com",
  {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

function App() {
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
    };
  }, [hostId, modifierKeys]);

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

  const handleDisconnect = () => {
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
  `;

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
          background: '#000'
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
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#000',
            position: 'relative',
            padding: '20px'
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
                width="1580"
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



              <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/RemoteDeskApp+Setup+1.0.0.exe">
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
                <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/RemoteDeskApp+Setup+1.0.0.exe">
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
                      color: "#FFC107",
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
                          background:"white",
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
              style={{ background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)", borderColor: "transparent", marginTop: "10px" }}
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
    </div>
  );
}

export default App;