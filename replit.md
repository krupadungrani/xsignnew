# Overview

XSignature is a full-stack digital signature application that allows users to upload PDF documents, create digital signatures, and apply those signatures to specific positions within PDFs. The application provides a comprehensive document signing workflow with certificate-based digital signatures, email verification, and an intuitive drag-and-drop interface for signature placement.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **PDF Handling**: react-pdf library for rendering and displaying PDF documents
- **Drag & Drop**: react-dnd with HTML5 backend for signature positioning
- **Form Management**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Custom JWT-less session management with bcrypt password hashing
- **File Handling**: Multer middleware for PDF uploads with 50MB size limit
- **PDF Processing**: pdf-lib for PDF manipulation and signature application
- **Email Service**: Nodemailer for verification emails and notifications

## Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Structure**:
  - Users table with email verification workflow
  - Digital signatures table storing certificate data and encrypted private keys
  - PDF documents table with file metadata and page counts
  - Applied signatures table tracking signature placements with position data
- **Relationships**: Proper foreign key constraints linking users to their signatures and documents

## Security Architecture
- **Certificate Management**: Node-forge for RSA key pair generation and X.509 certificate creation
- **Password Security**: bcrypt with salt rounds for password hashing
- **Private Key Protection**: Encrypted storage of signature private keys
- **File Validation**: Strict PDF-only upload filtering with MIME type checking
- **Input Validation**: Zod schemas for runtime type checking and validation

## Development Architecture
- **Monorepo Structure**: Shared TypeScript schemas between client and server
- **Hot Reload**: Vite dev server with HMR for frontend development
- **Database Migrations**: Drizzle Kit for schema migrations and database management
- **Build Process**: Separate builds for client (Vite) and server (esbuild)
- **Path Aliases**: TypeScript path mapping for clean imports

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: ws library for Neon database connections

## Email Services  
- **SMTP Integration**: Configurable email service (defaults to Gmail SMTP)
- **Email Templates**: HTML-based verification emails with responsive design

## UI Component Libraries
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens

## PDF Processing
- **PDF.js**: Client-side PDF rendering and display
- **pdf-lib**: Server-side PDF manipulation and signature embedding
- **React PDF**: React components for PDF document display

## Development Tools
- **Replit Integration**: Vite plugins for Replit development environment
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **ESLint/Prettier**: Code formatting and linting (implied by TypeScript setup)

## Authentication & Security
- **Node-forge**: Cryptographic operations and certificate management
- **bcrypt**: Password hashing and verification
- **Crypto**: Node.js built-in crypto module for token generation