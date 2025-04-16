// // frontend/src/App.jsx

// import { useEffect, useRef, useState } from "react";
// import io from "socket.io-client";
// import 'antd/dist/reset.css';
// import {
//   Layout,
//   Button,
//   Card,
//   Typography,
//   Space,
//   Divider,
//   Badge,
//   Empty,
//   Tag,
//   Row,
//   Col,
//   Avatar,
//   Tooltip,
//   Input,
//   Modal,
//   message,
//   Alert
// } from "antd";
// import {
//   DesktopOutlined,
//   PoweroffOutlined,
//   SettingOutlined,
//   CopyOutlined,
//   UserOutlined,
//   DisconnectOutlined,
//   ReloadOutlined,
//   LinkOutlined,
//   DownloadOutlined
// } from "@ant-design/icons";

// // Replace the missing KeyboardOutlined with an available icon
// // Import these standard icons that definitely exist
// import {
//   LaptopOutlined,  // Use instead of KeyboardOutlined
//   CloseCircleOutlined, // Use instead of DisconnectOutlined if it doesn't exist
//   SyncOutlined // Alternative for ReloadOutlined if needed
// } from "@ant-design/icons";

// const { Header, Content, Footer } = Layout;
// const { Title, Text } = Typography;

// // Create socket with reconnection options
// const socket = io(
//   "https://flydesk.pizeonfly.com",
//   // "http://15.206.194.12:8080",
//   // "http://192.168.29.140:8080",
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

//   useEffect(() => {
//     // Setup socket connection listeners
//     socket.on("connect", () => {
//       setConnectionStatus("Connected");

//       // If we were already connected to a host before, reconnect
//       if (hostId) {
//         // Re-establish connection with host
//         socket.emit("connect-to-host", hostId);

//         // Request screen data again
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

//       // Delay before resetting to normal status
//       setTimeout(() => {
//         setConnectionStatus("Connected");
//       }, 2000);
//     });

//     // Setup ping interval to keep connection alive
//     const pingInterval = setInterval(() => {
//       if (socket.connected) {
//         socket.emit("keep-alive");
//       }
//     }, 15000); // Every 15 seconds

//     // Host availability handler
//     socket.on("host-available", (hostInfo) => {
//       setAvailableHosts(prev => {
//         // Check if this host already exists in our list
//         const exists = prev.some(host => host.id === hostInfo.id);
//         if (exists) {
//           // Update existing host
//           return prev.map(host =>
//             host.id === hostInfo.id ? hostInfo : host
//           );
//         } else {
//           // Add new host
//           return [...prev, hostInfo];
//         }
//       });
//     });

//     // Add handler for screen data
//     socket.on("screen-data", (data) => {
//       if (!canvasRef.current) return;

//       const img = new Image();
//       img.onload = () => {
//         const ctx = canvasRef.current.getContext('2d');
//         ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
//       };
//       img.src = data.imageData;
//     });

//     // Global key handlers
//     const handleKeyDown = (e) => {
//       if (!hostId) return;

//       // Track modifier key states
//       if (e.key === 'Shift') {
//         setModifierKeys(prev => ({ ...prev, shift: true }));
//       } else if (e.key === 'Control') {
//         setModifierKeys(prev => ({ ...prev, control: true }));
//       } else if (e.key === 'Alt') {
//         setModifierKeys(prev => ({ ...prev, alt: true }));
//       } else if (e.key === 'Meta') { // Windows key
//         setModifierKeys(prev => ({ ...prev, meta: true }));
//       } else if (e.key === 'CapsLock') {
//         setModifierKeys(prev => ({ ...prev, capsLock: !prev.capsLock }));
//       }

//       // Prevent defaults to avoid browser actions
//       e.preventDefault();

//       console.log("Key down:", e.key, "Modifiers:",
//         `Shift:${e.shiftKey}, Ctrl:${e.ctrlKey}, Alt:${e.altKey}, Meta:${e.metaKey}, CapsLock:${e.getModifierState('CapsLock')}`);

//       // Send key event with all necessary information
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

//       // Track modifier key states
//       if (e.key === 'Shift') {
//         setModifierKeys(prev => ({ ...prev, shift: false }));
//       } else if (e.key === 'Control') {
//         setModifierKeys(prev => ({ ...prev, control: false }));
//       } else if (e.key === 'Alt') {
//         setModifierKeys(prev => ({ ...prev, alt: false }));
//       } else if (e.key === 'Meta') { // Windows key
//         setModifierKeys(prev => ({ ...prev, meta: false }));
//       }

//       // Prevent defaults to avoid browser actions
//       e.preventDefault();

//       console.log("Key up:", e.key);

//       // Send key up event
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

//     // Add global keyboard listeners
//     document.addEventListener('keydown', handleKeyDown);
//     document.addEventListener('keyup', handleKeyUp);

//     // Add this inside your useEffect where other socket listeners are set up
//     socket.on("host-disconnect-ack", () => {
//       console.log("Host acknowledged disconnect request");
//       setHostId("");
//       setConnected(false);
//       setKeyboardActive(false);
//     });

//     socket.on("code-accepted", (hostInfo) => {
//       console.log("Code accepted, waiting for host approval");
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

//       // Connect to the host
//       setHostId(hostInfo.hostId);
//       setConnected(true);
//       setFullScreenMode(true);
//       setCurrentHostInfo({
//         id: hostInfo.hostId,
//         name: hostInfo.hostName
//       });

//       // Tell the host we want to connect
//       socket.emit("connect-to-host", hostInfo.hostId);

//       // Request screen data
//       socket.emit("request-screen", {
//         to: hostInfo.hostId,
//         from: socket.id
//       });

//       // Activate keyboard
//       setKeyboardActive(true);
//     });

//     socket.on("connection-rejected", () => {
//       message.error("Connection rejected by host");
//       setPendingConnection(false);
//       setPendingHostInfo(null);
//     });

//     return () => {
//       // Clear all listeners and intervals
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
//   }, [hostId, modifierKeys]); // Include hostId and modifierKeys in dependencies

//   const connectToHost = (hostInfo) => {
//     setHostId(hostInfo.id);
//     setConnected(true);
//     setFullScreenMode(true);
//     setCurrentHostInfo(hostInfo);

//     // Tell the host we want to connect
//     socket.emit("connect-to-host", hostInfo.id);

//     // Request screen data
//     socket.emit("request-screen", {
//       to: hostInfo.id,
//       from: socket.id
//     });

//     // Activate keyboard
//     setKeyboardActive(true);
//   };

//   // Mouse handlers
//   const handleMouseMove = (e) => {
//     if (!hostId) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     // Calculate the ratio between display size and actual canvas size
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;

//     // Scale the coordinates to match the original canvas dimensions
//     const scaledX = x * scaleX;
//     const scaledY = y * scaleY;

//     // Send absolute position and canvas dimensions
//     socket.emit("remote-mouse-move", {
//       to: hostId,
//       x: scaledX,
//       y: scaledY,
//       screenWidth: canvasRef.current.width,
//       screenHeight: canvasRef.current.height
//     });
//   };

//   const handleMouseClick = (e) => {
//     e.preventDefault(); // Prevent default browser behavior
//     if (!hostId) return;

//     console.log("Mouse clicked:", e.button); // Debugging

//     let button = "left";
//     if (e.button === 1) button = "middle";
//     if (e.button === 2) button = "right";

//     socket.emit("remote-mouse-click", {
//       to: hostId,
//       button: button
//     });
//   };

//   // Prevent context menu on right-click
//   const handleContextMenu = (e) => {
//     e.preventDefault();
//     return false;
//   };

//   const handleMouseWheel = (e) => {
//     if (!hostId) return;

//     // Prevent default scrolling
//     e.preventDefault();

//     // Get scroll direction and amount
//     const delta = e.deltaY || e.detail || e.wheelDelta;

//     console.log("Mouse scroll:", delta);

//     socket.emit("remote-mouse-scroll", {
//       to: hostId,
//       deltaY: delta
//     });
//   };

//   const getStatusColor = () => {
//     if (connectionStatus.includes("Connected")) return "success";
//     if (connectionStatus.includes("Reconnecting")) return "warning";
//     return "error";
//   };

//   const handleDisconnect = () => {
//     if (hostId) {
//       // Send disconnect request to the host
//       socket.emit("client-disconnect-request", {
//         from: socket.id,
//         to: hostId
//       });

//       // Wait for acknowledgment but also proceed with cleanup
//       setTimeout(() => {
//         setHostId("");
//         setConnected(false);
//         setKeyboardActive(false);
//         setCurrentHostInfo(null);
//       }, 500); // Allow some time for the message to be sent
//     }
//     setFullScreenMode(false);
//   };

//   // Function to handle download
//   const handleDownload = () => {
//     const link = document.createElement("a");
//     link.href = "https://drive.google.com/uc?export=download&id=1GPAMoyyfJkI_xfG2f1salpYaV5Hb5YZG";
//     link.setAttribute("download", "RemoteDeskApp_Setup.exe"); // Suggested name
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // Add these functions for the session code flow
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

//   return (
//     <div style={{ height: '100vh', overflow: 'hidden' }}>
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

//             <Space>
//               <Button
//                 type="primary"
//                 danger
//                 icon={<CloseCircleOutlined />}
//                 onClick={handleDisconnect}
//                 size="small"
//               >
//                 Exit
//               </Button>
//             </Space>
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
//                 maxHeight: 'calc(100vh - 50px)' // Account for the small header
//               }}
//             />

//             {/* Floating keyboard status indicator */}
//             {/* <div style={{
//               position: 'absolute',
//               bottom: '10px',
//               right: '10px',
//               background: 'rgba(0, 0, 0, 0.7)',
//               padding: '6px 10px',
//               borderRadius: '4px',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '8px'
//             }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
//                 <LaptopOutlined style={{ color: keyboardActive ? '#52c41a' : '#999' }} />
//                 <Text style={{ color: 'white', margin: 0 }}>Keyboard</Text>
//                 <div style={{ 
//                   width: '8px', 
//                   height: '8px', 
//                   borderRadius: '50%', 
//                   backgroundColor: keyboardActive ? '#52c41a' : '#999' 
//                 }} />
//               </div>

//               <div style={{ display: 'flex', gap: '2px' }}>
//                 <Tag color={modifierKeys.shift ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>SHIFT</Tag>
//                 <Tag color={modifierKeys.control ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>CTRL</Tag>
//                 <Tag color={modifierKeys.alt ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>ALT</Tag>
//                 <Tag color={modifierKeys.capsLock ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>CAPS</Tag>
//               </div>
//             </div> */}
//           </div>
//         </div>
//       ) : (
//         // Normal layout when not connected
//         <Layout className="layout" style={{ minHeight: "100vh" }}>
//           <Header style={{
//             background: "#121211",
//             boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "0 24px"
//           }}>
//             <div style={{ display: "flex", alignItems: "center" }}>
//               {/* <Avatar
//                 style={{
//                   backgroundColor: "#ff4d4f",
//                   marginRight: 12,
//                   display: "flex",
//                   justifyContent: "center",
//                   alignItems: "center"
//                 }}
//                 icon={<DesktopOutlined />}
//                 size="large"
//               />
//               <Title level={3} style={{ margin: 0 }}>FLYDESK</Title> */}
//               <img src="Images/flydesk1.png" style={{width: "30vh", height: "50px"}}/>
//             </div>



//             <Space>
//               <div style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px"
//               }}>
//                 <span style={{
//                   width: "8px",
//                   height: "8px",
//                   borderRadius: "50%",
//                   backgroundColor: connectionStatus.includes("Connected") ? "#52c41a" :
//                     connectionStatus.includes("Reconnecting") ? "#faad14" : "#f5222d",
//                   display: "inline-block"
//                 }}></span>
//                 <Text style={{color: "white"}}> {connectionStatus} </Text>
//               </div>
//               <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/RemoteDeskApp+Setup+1.0.0.exe">
//               <Button
//                 type="primary"
//                 icon={<DownloadOutlined />}
//                 // style={{
//                 //   backgroundColor: "#52c41a",
//                 //   borderColor: "#52c41a"
//                 // }}
//               >
//                 Download FLYDESK App
//               </Button>
//               </a>
//             </Space>
//           </Header>

//           <Content style={{ padding: "24px", background: "#f0f2f5" }}>
//             <Card
//               title={
//                 <Title level={4} style={{ margin: 0, textAlign: "center" }}>
//                   <Space>
//                     <LinkOutlined />
//                     Connect to FLYDESK
//                   </Space>
//                 </Title>
//               }
//               bordered={false}
//               style={{ maxWidth: 800, margin: "0 auto", borderRadius: "8px" }}
//             >
//               <div style={{ textAlign: "center", padding: "24px" }}>
//                 <Space direction="vertical" size="large" style={{ width: "100%" }}>
//                   <Text>Enter the session code provided by the host computer</Text>

//                   <Button
//                     type="primary"
//                     size="large"
//                     icon={<LinkOutlined />}
//                     onClick={showCodeInput}
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
//                 </Space>
//               </div>
//             </Card>
//           </Content>

//           {/* Pizeonfly Ad Section - Modern Design without Card */}
//           <div style={{ 
//             padding: "60px 0", 
//             background: "linear-gradient(135deg, #4169e1 0%, #3b5fe2 100%)",
//             overflow: "hidden",
//             position: "relative"
//           }}>
//             {/* Background design elements */}
//             <div style={{ 
//               position: "absolute", 
//               top: "20px", 
//               left: "5%", 
//               width: "200px", 
//               height: "200px", 
//               borderRadius: "50%", 
//               background: "rgba(255,255,255,0.1)",
//               zIndex: 0
//             }}></div>
//             <div style={{ 
//               position: "absolute", 
//               bottom: "30px", 
//               right: "10%", 
//               width: "150px", 
//               height: "150px", 
//               borderRadius: "50%", 
//               background: "rgba(255,255,255,0.1)",
//               zIndex: 0
//             }}></div>

//             <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", zIndex: 1, position: "relative" }}>
//               <Row gutter={[40, 30]} align="middle">
//                 <Col xs={24} md={12}>
//                   <div style={{ color: "#fff" }}>
//                     <Title level={2} style={{ color: "#fff", marginBottom: "20px", fontSize: "32px", fontWeight: "600" }}>
//                       Results Driven Website Design and Digital Marketing
//                     </Title>
//                     <Text style={{ 
//                       fontSize: "18px", 
//                       display: "block", 
//                       marginBottom: "30px", 
//                       lineHeight: "1.6",
//                       color: "rgba(255, 255, 255, 0.9)"
//                     }}>
//                       At Pizeonfly, we don't just design websites, we build digital experiences 
//                       that elevate your brand and drive lasting success.
//                     </Text>
//                     <Space size="large">
//                       <Button 
//                         type="primary" 
//                         size="large" 
//                         style={{ 
//                           background: "#ff5252", 
//                           borderColor: "#ff5252", 
//                           height: "48px", 
//                           padding: "0 25px",
//                           fontSize: "16px",
//                           fontWeight: "500",
//                           borderRadius: "6px"
//                         }}
//                       >
//                         Get My Free Proposal
//                       </Button>
//                       <Button 
//                         ghost 
//                         size="large" 
//                         style={{ 
//                           borderColor: "#fff", 
//                           color: "#fff",
//                           height: "48px", 
//                           padding: "0 25px",
//                           fontSize: "16px",
//                           fontWeight: "500",
//                           borderRadius: "6px"
//                         }}
//                       >
//                         Learn more
//                       </Button>
//                     </Space>
//                   </div>
//                 </Col>
//                 <Col xs={24} md={12} style={{ textAlign: "center" }}>
//                   <div style={{ 
//                     position: "relative", 
//                     display: "inline-block",
//                     borderRadius: "10px",
//                     boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
//                     overflow: "hidden"
//                   }}>
//                     <img 
//                       src="Images/pizeonfly.png" 
//                       alt="Pizeonfly Digital Agency" 
//                       style={{ 
//                         maxWidth: "100%", 
//                         borderRadius: "10px", 
//                         transform: "scale(1.03)",
//                         transition: "transform 0.5s ease"
//                       }}
//                     />
//                   </div>
//                 </Col>
//               </Row>

//               {/* Brand Highlights */}
//               <Row justify="space-between" style={{ marginTop: "50px" }}>
//                 <Col xs={24} sm={7} style={{ textAlign: "center", color: "#fff" }}>
//                   <Title level={2} style={{ color: "#fff", fontSize: "36px", margin: "0" }}>200+</Title>
//                   <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px" }}>Happy Clients</Text>
//                 </Col>
//                 <Col xs={24} sm={7} style={{ textAlign: "center", color: "#fff" }}>
//                   <Title level={2} style={{ color: "#fff", fontSize: "36px", margin: "0" }}>98%</Title>
//                   <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px" }}>Client Satisfaction</Text>
//                 </Col>
//                 <Col xs={24} sm={7} style={{ textAlign: "center", color: "#fff" }}>
//                   <Title level={2} style={{ color: "#fff", fontSize: "36px", margin: "0" }}>10+</Title>
//                   <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px" }}>Years of Experience</Text>
//                 </Col>
//               </Row>
//             </div>
//           </div>

//           <Footer style={{ textAlign: "center" }}>
//             FLYDESK ©{new Date().getFullYear()} | All Rights Reserved
//           </Footer>
//         </Layout>
//       )}

//       {/* Code Input Modal */}
//       <Modal
//         title="Enter Session Code"
//         open={codeInputVisible}
//         onOk={handleCodeSubmit}
//         onCancel={() => setCodeInputVisible(false)}
//       >
//         <Input
//           placeholder="6-digit code"
//           maxLength={6}
//           size="large"
//           style={{ width: "100%", textAlign: "center", letterSpacing: "0.5em", fontSize: "24px" }}
//           value={sessionCode}
//           onChange={(e) => setSessionCode(e.target.value.replace(/[^0-9]/g, ''))}
//         />
//       </Modal>
//     </div>
//   );
// }

// export default App;


// frontend/src/App.jsx

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
  CloseOutlined
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

  return (
    <div style={{ height: '100vh' }}>
      {fullScreenMode ? (
        // Fullscreen mode when connected to a host
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#000'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.8)'
          }}>
            <Space>
              <Badge status="processing" />
              <Text style={{ color: 'white' }} strong>
                Connected to: {currentHostInfo ? currentHostInfo.name : `Host ${hostId.substring(0, 8)}`}
              </Text>
            </Space>

              <Button
                type="primary"
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleDisconnect}
                size="small"
              >
                Exit
              </Button>
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#000',
            position: 'relative'
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
                maxHeight: 'calc(100vh - 50px)'
              }}
            />
          </div>
        </div>
      ) : (
        // Modern layout without using Card components
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Modern Header */}
          <header style={{
            background: "linear-gradient(90deg, #121211 0%, #1a1a1a 100%)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10
          }}>
            <div>
              <img src="Images/flydesk1.png" style={{ width: "30vh", height: "50px" }} alt="FLYDESK" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255,255,255,0.05)",
                padding: "6px 10px",
                borderRadius: "4px"
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: connectionStatus.includes("Connected") ? "#52c41a" :
                    connectionStatus.includes("Reconnecting") ? "#faad14" : "#f5222d",
                }}></span>
                <Text style={{ color: "white", margin: 0 }}>{connectionStatus}</Text>
              </div>

              <a href="https://remotedesk-downloads.s3.ap-south-1.amazonaws.com/RemoteDeskApp+Setup+1.0.0.exe">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                style={{
                    height: "40px",
                    padding: "0 15px",
                    borderRadius: "6px",
                    fontWeight: 500,
                    boxShadow: "0 2px 0 rgba(0,0,0,0.045)"
                  }}
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
              backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              padding: "70px 20px",
              textAlign: "center",
              color: "white",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Background effects */}
              <div style={{
                position: "absolute",
                top: "10%",
                left: "5%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(66,99,235,0.1) 0%, rgba(66,99,235,0) 70%)",
                zIndex: 0
              }}></div>
              <div style={{
                position: "absolute",
                bottom: "10%",
                right: "8%",
                width: "250px",
                height: "250px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(66,99,235,0.1) 0%, rgba(66,99,235,0) 70%)",
                zIndex: 0
              }}></div>

              <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
                <Title level={1} style={{
                  color: "white",
                  fontSize: "3rem",
                  marginBottom: "20px",
                  fontWeight: "600",
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)"
                }}>
                  Remote Control Made Simple
                </Title>
                <Paragraph style={{
                  fontSize: "1.2rem",
                  color: "rgba(255,255,255,0.9)",
                  maxWidth: "600px",
                  margin: "0 auto 30px",
                  lineHeight: "1.6"
                }}>
                  Connect securely to any computer anywhere in the world with FLYDESK's powerful remote desktop solution.
                </Paragraph>

                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  padding: "40px",
                  maxWidth: "500px",
                  margin: "30px auto",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <Title level={3} style={{ color: "white", marginBottom: "25px" }}>
                  <Space>
                    <LinkOutlined />
                    Connect to Remote Desktop
                  </Space>
                </Title>

                  <Paragraph style={{ color: "rgba(255,255,255,0.8)", marginBottom: "25px" }}>
                    Enter the 6-digit session code provided by the host computer
                  </Paragraph>

                  <Button
                    type="primary"
                    size="large"
                    icon={<LinkOutlined />}
                    onClick={showCodeInput}
                    style={{
                      height: "48px",
                      fontSize: "16px",
                      fontWeight: "500",
                      padding: "0 30px",
                      background: "#4263eb",
                      borderColor: "#4263eb",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(66,99,235,0.3)"
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
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Pizeonfly Advertisement Section */}
            <section style={{
              padding: "80px 0",
              background: "linear-gradient(135deg, #4169e1 0%, #3b5fe2 100%)",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Decorative Elements */}
              <div style={{
                position: "absolute",
                top: "-50px",
                left: "-50px",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                zIndex: 0
              }}></div>
              <div style={{
                position: "absolute",
                bottom: "-80px",
                right: "10%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                zIndex: 0
              }}></div>
              <div style={{
                position: "absolute",
                top: "30%",
                right: "-50px",
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                zIndex: 0
              }}></div>

              <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", position: "relative", zIndex: 1 }}>
                <Row gutter={[50, 40]} align="middle">
                  <Col xs={24} md={12}>
                    <div style={{ color: "#fff" }}>
                      <Title level={2} style={{
                        color: "#fff",
                        marginBottom: "25px",
                        fontSize: "38px",
                        fontWeight: "600",
                        lineHeight: "1.2"
                      }}>
                        Results Driven Website Design and Digital Marketing
                      </Title>
                      <Paragraph style={{
                        fontSize: "18px",
                        marginBottom: "30px",
                        lineHeight: "1.7",
                        color: "rgba(255, 255, 255, 0.9)"
                      }}>
                        At Pizeonfly, we don't just design websites, we build digital experiences
                        that elevate your brand and drive lasting success. Our team of experts creates
                        stunning websites that convert visitors into customers.
                      </Paragraph>
                      <Space size="large">
                        {/* <Button
                          type="primary"
                          size="large"
                          style={{
                            background: "#ff5252",
                            borderColor: "#ff5252",
                            height: "50px",
                            padding: "0 28px",
                            fontSize: "16px",
                            fontWeight: "500",
                            borderRadius: "6px",
                            boxShadow: "0 6px 16px rgba(255,82,82,0.3)"
                          }}
                        >
                          Get My Free Proposal
                        </Button> */}
                        <a href="https://pizeonfly.com" target="_blank">
                        <Button
                          ghost
                          size="large"
                          style={{
                            borderColor: "#fff",
                            color: "#fff",
                            height: "50px",
                            padding: "0 28px",
                            fontSize: "16px",
                            fontWeight: "500",
                            borderRadius: "6px"
                          }}
                        >
                          Learn more
                        </Button>
                        </a>
                </Space>
              </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      // boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                      // transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)",
                      // transition: "all 0.5s ease"
                    }}>
                      <img
                        src="Images/pizeonfly.png"
                        alt="Pizeonfly Digital Agency"
                        style={{
                          width: "100%",
                          display: "block",
                          // transform: "scale(1.02)"
                        }}
                      />

                      {/* Overlay gradient */}
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(135deg, rgba(66,99,235,0.2) 0%, rgba(255,82,82,0.1) 100%)",
                        pointerEvents: "none"
                      }}></div>
                    </div>
                  </Col>
                </Row>

                {/* Stats Section */}
                <div style={{
                  marginTop: "70px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  padding: "30px",
                  backdropFilter: "blur(5px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                }}>
                  <Row gutter={[20, 30]} justify="space-around">
                    <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                      <div style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center"
                      }}>
                        <Text style={{
                          fontSize: "48px",
                          fontWeight: "700",
                          color: "#fff",
                          lineHeight: "1"
                        }}>200+</Text>
                        <Text style={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: "16px",
                          marginTop: "5px"
                        }}>Happy Clients</Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                      <div style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center"
                      }}>
                        <Text style={{
                          fontSize: "48px",
                          fontWeight: "700",
                          color: "#fff",
                          lineHeight: "1"
                        }}>98%</Text>
                        <Text style={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: "16px",
                          marginTop: "5px"
                        }}>Client Satisfaction</Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={8} style={{ textAlign: "center" }}>
                      <div style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "center"
                      }}>
                        <Text style={{
                          fontSize: "48px",
                          fontWeight: "700",
                          color: "#fff",
                          lineHeight: "1"
                        }}>10+</Text>
                        <Text style={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: "16px",
                          marginTop: "5px"
                        }}>Years of Experience</Text>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </section>

            {/* Features Section */}
            {/* <section style={{
              padding: "70px 20px",
              background: "#f7f9fc"
            }}>
              <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <Title level={2} style={{ textAlign: "center", marginBottom: "50px", color: "#222" }}>
                  Why Choose FLYDESK?
                </Title>

                <Row gutter={[30, 40]}>
                  <Col xs={24} md={8}>
                    <div style={{
                      background: "#fff",
                      borderRadius: "10px",
                      padding: "30px",
                      height: "100%",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      cursor: "pointer"
                    }}>
                      <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
                        <LaptopOutlined />
                      </div>
                      <Title level={4}>Secure Connection</Title>
                      <Text style={{ color: "#666" }}>
                        End-to-end encrypted connections ensure your remote sessions remain private and secure.
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{
                      background: "#fff",
                      borderRadius: "10px",
                      padding: "30px",
                      height: "100%",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      cursor: "pointer"
                    }}>
                      <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
                        <PoweroffOutlined />
                      </div>
                      <Title level={4}>Low Latency</Title>
                      <Text style={{ color: "#666" }}>
                        Experience smooth, responsive remote control with our optimized connection technology.
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{
                      background: "#fff",
                      borderRadius: "10px",
                      padding: "30px",
                      height: "100%",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      cursor: "pointer"
                    }}>
                      <div style={{ fontSize: "32px", color: "#4169e1", marginBottom: "15px" }}>
                        <DesktopOutlined />
                      </div>
                      <Title level={4}>Cross Platform</Title>
                      <Text style={{ color: "#666" }}>
                        Connect from any device to any computer, regardless of operating system.
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </section> */}
          </main>

          {/* Modern Footer */}
          <footer style={{
            background: "#121211",
            color: "#fff",
            padding: "20px 0",
            borderTop: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
              <Row gutter={[30, 20]} justify="space-between" align="middle">
                <Col xs={24} sm={12}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img src="Images/flydesk1.png" style={{ height: "40px" }} alt="FLYDESK" />
                  </div>
                  <Text style={{ color: "rgba(255,255,255,0.7)", display: "block", marginTop: "10px" }}>
                    The most reliable remote desktop solution for professionals.
                  </Text>
                </Col>
                <Col xs={24} sm={12} style={{ textAlign: "right" }}>
                  <Space split={<Divider type="vertical" style={{ borderColor: "rgba(255,255,255,0.2)" }} />}>
                    <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Terms</a>
                    <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Privacy</a>
                    <a href="#" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>Support</a>
                  </Space>
                </Col>
              </Row>

              <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "15px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <Text style={{ color: "rgba(255,255,255,0.5)" }}>
                  FLYDESK ©{new Date().getFullYear()} | All Rights Reserved
                </Text>
                <div>
                  <Space size="large">
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
              contentBg: '#1f1f1f',
              headerBg: '#1f1f1f',
              titleColor: 'rgba(255,255,255,0.85)',
              footerBg: '#1f1f1f',
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
              style={{ background: "#4169e1", borderColor: "#4169e1", marginTop: "10px" }}
            >
              Connect
            </Button>
          ]}
          styles={{
            mask: { backdropFilter: 'blur(5px)', background: 'rgba(0,0,0,0.45)' },
            content: { 
              borderRadius: '8px',
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
    </div>
  );
}

export default App;