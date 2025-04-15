// frontend/src/App.jsx

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import 'antd/dist/reset.css';
import { 
  Layout, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Divider, 
  Badge, 
  Empty, 
  Tag, 
  Row, 
  Col, 
  Avatar, 
  Tooltip
} from "antd";
import { 
  DesktopOutlined, 
  PoweroffOutlined, 
  SettingOutlined, 
  CopyOutlined,
  UserOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  LinkOutlined,
  DownloadOutlined
} from "@ant-design/icons";

// Replace the missing KeyboardOutlined with an available icon
// Import these standard icons that definitely exist
import {
  LaptopOutlined,  // Use instead of KeyboardOutlined
  CloseCircleOutlined, // Use instead of DisconnectOutlined if it doesn't exist
  SyncOutlined // Alternative for ReloadOutlined if needed
} from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// Create socket with reconnection options
const socket = io("http://15.206.194.12:8080", {
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

  useEffect(() => {
    // Setup socket connection listeners
    socket.on("connect", () => {
      setConnectionStatus("Connected");
      
      // If we were already connected to a host before, reconnect
      if (hostId) {
        // Re-establish connection with host
        socket.emit("connect-to-host", hostId);
        
        // Request screen data again
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
      
      // Delay before resetting to normal status
      setTimeout(() => {
        setConnectionStatus("Connected");
      }, 2000);
    });
    
    // Setup ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("keep-alive");
      }
    }, 15000); // Every 15 seconds
    
    // Host availability handler
    socket.on("host-available", (hostInfo) => {
      setAvailableHosts(prev => {
        // Check if this host already exists in our list
        const exists = prev.some(host => host.id === hostInfo.id);
        if (exists) {
          // Update existing host
          return prev.map(host => 
            host.id === hostInfo.id ? hostInfo : host
          );
        } else {
          // Add new host
          return [...prev, hostInfo];
        }
      });
    });

    // Add handler for screen data
    socket.on("screen-data", (data) => {
      if (!canvasRef.current) return;
      
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      img.src = data.imageData;
    });

    // Global key handlers
    const handleKeyDown = (e) => {
      if (!hostId) return;
      
      // Track modifier key states
      if (e.key === 'Shift') {
        setModifierKeys(prev => ({...prev, shift: true}));
      } else if (e.key === 'Control') {
        setModifierKeys(prev => ({...prev, control: true}));
      } else if (e.key === 'Alt') {
        setModifierKeys(prev => ({...prev, alt: true}));
      } else if (e.key === 'Meta') { // Windows key
        setModifierKeys(prev => ({...prev, meta: true}));
      } else if (e.key === 'CapsLock') {
        setModifierKeys(prev => ({...prev, capsLock: !prev.capsLock}));
      }
      
      // Prevent defaults to avoid browser actions
      e.preventDefault();
      
      console.log("Key down:", e.key, "Modifiers:", 
        `Shift:${e.shiftKey}, Ctrl:${e.ctrlKey}, Alt:${e.altKey}, Meta:${e.metaKey}, CapsLock:${e.getModifierState('CapsLock')}`);
      
      // Send key event with all necessary information
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
      
      // Track modifier key states
      if (e.key === 'Shift') {
        setModifierKeys(prev => ({...prev, shift: false}));
      } else if (e.key === 'Control') {
        setModifierKeys(prev => ({...prev, control: false}));
      } else if (e.key === 'Alt') {
        setModifierKeys(prev => ({...prev, alt: false}));
      } else if (e.key === 'Meta') { // Windows key
        setModifierKeys(prev => ({...prev, meta: false}));
      }
      
      // Prevent defaults to avoid browser actions
      e.preventDefault();
      
      console.log("Key up:", e.key);
      
      // Send key up event
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
    
    // Add global keyboard listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Add this inside your useEffect where other socket listeners are set up
    socket.on("host-disconnect-ack", () => {
      console.log("Host acknowledged disconnect request");
      setHostId("");
      setConnected(false);
      setKeyboardActive(false);
    });
    
    return () => {
      // Clear all listeners and intervals
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
  }, [hostId, modifierKeys]); // Include hostId and modifierKeys in dependencies

  const connectToHost = (hostInfo) => {
    setHostId(hostInfo.id);
    setConnected(true);
    setFullScreenMode(true);
    setCurrentHostInfo(hostInfo);
    
    // Tell the host we want to connect
    socket.emit("connect-to-host", hostInfo.id);
    
    // Request screen data
    socket.emit("request-screen", {
      to: hostInfo.id,
      from: socket.id
    });
    
    // Activate keyboard
    setKeyboardActive(true);
  };

  // Mouse handlers
  const handleMouseMove = (e) => {
    if (!hostId) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate the ratio between display size and actual canvas size
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    // Scale the coordinates to match the original canvas dimensions
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    
    // Send absolute position and canvas dimensions
    socket.emit("remote-mouse-move", {
      to: hostId,
      x: scaledX,
      y: scaledY,
      screenWidth: canvasRef.current.width,
      screenHeight: canvasRef.current.height
    });
  };

  const handleMouseClick = (e) => {
    e.preventDefault(); // Prevent default browser behavior
    if (!hostId) return;
    
    console.log("Mouse clicked:", e.button); // Debugging
    
    let button = "left";
    if (e.button === 1) button = "middle";
    if (e.button === 2) button = "right";
    
    socket.emit("remote-mouse-click", {
      to: hostId,
      button: button
    });
  };

  // Prevent context menu on right-click
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const handleMouseWheel = (e) => {
    if (!hostId) return;
    
    // Prevent default scrolling
    e.preventDefault();
    
    // Get scroll direction and amount
    const delta = e.deltaY || e.detail || e.wheelDelta;
    
    console.log("Mouse scroll:", delta);
    
    socket.emit("remote-mouse-scroll", {
      to: hostId,
      deltaY: delta
    });
  };

  const getStatusColor = () => {
    if (connectionStatus.includes("Connected")) return "success";
    if (connectionStatus.includes("Reconnecting")) return "warning";
    return "error";
  };

  const handleDisconnect = () => {
    if (hostId) {
      // Send disconnect request to the host
      socket.emit("client-disconnect-request", {
        from: socket.id,
        to: hostId
      });
      
      // Wait for acknowledgment but also proceed with cleanup
      setTimeout(() => {
        setHostId("");
        setConnected(false);
        setKeyboardActive(false);
        setCurrentHostInfo(null);
      }, 500); // Allow some time for the message to be sent
    }
    setFullScreenMode(false);
  };

  // Function to handle download
  const handleDownload = () => {
    // Direct Google Drive download link
    const downloadUrl = "https://drive.google.com/uc?export=download&id=1AJ9W9m42kxcd3KgiqhcBdy1-vWKYQbll";
    
    // Open in new tab to trigger download
    window.open(downloadUrl, '_blank');
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
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
            
            <Space>
              <Button 
                type="primary" 
                danger 
                icon={<CloseCircleOutlined />}
                onClick={handleDisconnect}
                size="small"
              >
                Exit
              </Button>
            </Space>
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
                maxHeight: 'calc(100vh - 50px)' // Account for the small header
              }}
            />
            
            {/* Floating keyboard status indicator */}
            {/* <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '6px 10px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LaptopOutlined style={{ color: keyboardActive ? '#52c41a' : '#999' }} />
                <Text style={{ color: 'white', margin: 0 }}>Keyboard</Text>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: keyboardActive ? '#52c41a' : '#999' 
                }} />
              </div>
              
              <div style={{ display: 'flex', gap: '2px' }}>
                <Tag color={modifierKeys.shift ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>SHIFT</Tag>
                <Tag color={modifierKeys.control ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>CTRL</Tag>
                <Tag color={modifierKeys.alt ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>ALT</Tag>
                <Tag color={modifierKeys.capsLock ? 'blue' : ''} style={{ margin: 0, padding: '0 4px' }}>CAPS</Tag>
              </div>
            </div> */}
          </div>
        </div>
      ) : (
        // Normal layout when not connected
        <Layout className="layout" style={{ minHeight: "100vh" }}>
          <Header style={{ 
            background: "#fff", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 24px"
          }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar 
                style={{ 
                  backgroundColor: "#ff4d4f", 
                  marginRight: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
                icon={<DesktopOutlined />}
                size="large"
              />
              <Title level={3} style={{ margin: 0 }}>Remote Desktop</Title>
            </div>
            
            <Space>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: connectionStatus.includes("Connected") ? "#52c41a" : 
                                 connectionStatus.includes("Reconnecting") ? "#faad14" : "#f5222d",
                  display: "inline-block"
                }}></span>
                <Text>{connectionStatus}</Text>
              </div>
              
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={handleDownload}
                style={{
                  backgroundColor: "#52c41a", 
                  borderColor: "#52c41a"
                }}
              >
                Download RemoteDeskApp
              </Button>
            </Space>
          </Header>
          
          <Content style={{ padding: "24px", background: "#f0f2f5" }}>
            <Card 
              title={
                <Title level={4} style={{ margin: 0, textAlign: "center" }}>
                  <Space>
                    <LinkOutlined />
                    Available Hosts
                  </Space>
                </Title>
              }
              bordered={false}
              style={{ maxWidth: 800, margin: "0 auto", borderRadius: "8px" }}
            >
              {availableHosts.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      No hosts available. Waiting for connections...
                    </span>
                  }
                >
                  <Button type="primary" icon={<ReloadOutlined />}>
                    Refresh
                  </Button>
                </Empty>
              ) : (
                <Row gutter={[16, 16]}>
                  {availableHosts.map(host => (
                    <Col key={host.id} xs={24} sm={12} md={8}>
                      <Card
                        hoverable
                        style={{ borderRadius: "8px" }}
                        onClick={() => connectToHost(host)}
                      >
                        <div style={{ textAlign: "center" }}>
                          <Avatar 
                            size={64} 
                            icon={<UserOutlined />} 
                            style={{ 
                              backgroundColor: "#1890ff",
                              marginBottom: "16px"
                            }} 
                          />
                          <div>
                            <Text strong style={{ fontSize: "16px" }}>
                              {host.name || `Host ${host.id.substring(0, 8)}`}
                            </Text>
                            <div style={{ marginTop: "16px" }}>
                              <Button 
                                type="primary" 
                                danger
                                icon={<PoweroffOutlined />}
                              >
                                Connect
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Content>
          
          <Footer style={{ textAlign: "center" }}>
            Remote Desktop App ©{new Date().getFullYear()} | All Rights Reserved
          </Footer>
        </Layout>
      )}
    </div>
  );
}

export default App;
