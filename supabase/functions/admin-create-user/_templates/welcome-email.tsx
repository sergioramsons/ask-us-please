import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userName: string
  userEmail: string
  temporaryPassword: string
  loginUrl: string
  organizationName: string
}

export const WelcomeEmail = ({
  userName,
  userEmail,
  temporaryPassword,
  loginUrl,
  organizationName,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {organizationName} - Your account has been created</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to {organizationName}!</Heading>
        
        <Text style={text}>
          Hello {userName || 'there'},
        </Text>
        
        <Text style={text}>
          Your account has been created and you're all set to get started with our helpdesk system.
        </Text>
        
        <Section style={infoSection}>
          <Text style={infoTitle}>Your Login Details:</Text>
          <Text style={infoText}>
            <strong>Email:</strong> {userEmail}
          </Text>
          <Text style={infoText}>
            <strong>Temporary Password:</strong> <code style={code}>{temporaryPassword}</code>
          </Text>
        </Section>
        
        <Section style={buttonSection}>
          <Button href={loginUrl} style={button}>
            Access Your Account
          </Button>
        </Section>
        
        <Text style={text}>
          For security reasons, please log in and change your temporary password as soon as possible.
        </Text>
        
        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out to your system administrator.
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The {organizationName} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 20px 20px 20px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 20px',
}

const infoSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  margin: '24px 20px',
  padding: '20px',
}

const infoTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const infoText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 20px',
}

const button = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const code = {
  backgroundColor: '#f1f3f4',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  color: '#333',
  fontFamily: 'monospace',
  fontSize: '14px',
  padding: '4px 8px',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 20px 0 20px',
}