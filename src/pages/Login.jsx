import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:8080/api/login', values);
      
      if (response.data.success) {
        // Save user token to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        message.success('Login successful!');
        navigate('/');
      } else {
        message.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#000',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: 400, 
          maxWidth: '100%', 
          background: 'rgba(20, 20, 20, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/Images/flydesk1.png" alt="FlyDesk" style={{ height: '40px', marginBottom: '20px' }} />
          <Title level={3} style={{ color: 'white', margin: 0 }}>Login to FlyDesk</Title>
        </div>
        
        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Email" 
              size="large"
              style={{ 
                background: 'rgba(30, 30, 30, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password"
              size="large"
              style={{ 
                background: 'rgba(30, 30, 30, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block 
              loading={loading}
              style={{
                background: "linear-gradient(90deg, #0066FF 0%, #00BFFF 100%)",
                borderColor: "transparent",
                height: "45px",
                fontSize: "16px",
                fontWeight: "500",
                borderRadius: '8px',
                marginTop: '10px'
              }}
            >
              Log in
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Don't have an account? <Link to="/signup" style={{ color: '#00BFFF' }}>Sign up</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
