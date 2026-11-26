import React from 'react'

interface LogoProps {
  size?: number
}

export const YouTubeLogo: React.FC<LogoProps> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#FF0000"
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8z"
    />
    <path fill="#FFFFFF" d="M9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
  </svg>
)

export const VimeoLogo: React.FC<LogoProps> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1AB7EA"
      d="M22.9 7.4c-.1 2.1-1.6 5-4.4 8.7-2.9 3.8-5.4 5.7-7.4 5.7-1.3 0-2.3-1.2-3.2-3.5l-1.7-6.3C5.5 9.7 4.8 8.6 4 8.6c-.2 0-.8.4-1.8 1.1L1 8.3c1.1-1 2.2-2 3.3-3 1.5-1.3 2.6-2 3.4-2.1 1.8-.2 2.9 1 3.3 3.6.4 2.8.8 4.6 1 5.3.5 2.4 1.1 3.6 1.7 3.6.5 0 1.2-.8 2.2-2.3 1-1.5 1.5-2.7 1.6-3.5.1-1.4-.4-2.1-1.6-2.1-.6 0-1.2.1-1.8.4 1.2-3.9 3.5-5.8 6.9-5.7 2.5.1 3.7 1.7 3.5 4.9z"
    />
  </svg>
)

export const TwitchLogo: React.FC<LogoProps> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#9146FF"
      d="M4.3 2L2 6.3V20h5.5v2.5h3L13 20h4l5-5V2H4.3zm15.7 12l-3 3h-4.5l-2.5 2.5V17H6V4h14v10z"
    />
    <path fill="#9146FF" d="M15.5 7.5h2v5h-2zm-5 0h2v5h-2z" />
  </svg>
)

export const DailymotionLogo: React.FC<LogoProps> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="5" fill="#0066DC" />
    <path
      fill="#FFFFFF"
      d="M15.8 5v6.4c-.7-.8-1.7-1.2-2.9-1.2-2.5 0-4.4 2-4.4 4.6 0 2.7 1.9 4.6 4.4 4.6 1.2 0 2.2-.5 2.9-1.3v1h2.4V5h-2.4zm-2.4 12.1c-1.3 0-2.3-1-2.3-2.3 0-1.4 1-2.4 2.3-2.4 1.4 0 2.4 1 2.4 2.4 0 1.3-1 2.3-2.4 2.3z"
    />
  </svg>
)

export const SoundCloudLogo: React.FC<LogoProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#FF5500"
      d="M11.6 8.3c-.2 0-.4.1-.5.2v9.2h7.6c1.9 0 3.4-1.5 3.4-3.4 0-1.8-1.4-3.2-3.1-3.3-.4-1.6-1.9-2.7-3.6-2.7-.6 0-1.2.1-1.7.4-.5-.3-1.2-.4-2.1-.4zM8.9 9.7c-.4 0-.7.3-.7.7v6.6c0 .4.3.7.7.7s.7-.3.7-.7v-6.6c0-.4-.3-.7-.7-.7zm-2.4 1.5c-.4 0-.7.3-.7.7v5.1c0 .4.3.7.7.7s.7-.3.7-.7v-5.1c0-.4-.3-.7-.7-.7zm-2.4 1.5c-.4 0-.7.3-.7.7v3.6c0 .4.3.7.7.7s.7-.3.7-.7v-3.6c0-.4-.3-.7-.7-.7zM1.7 14c-.4 0-.7.3-.7.7v2.3c0 .4.3.7.7.7s.7-.3.7-.7v-2.3c0-.4-.3-.7-.7-.7z"
    />
  </svg>
)

export const GoogleDriveLogo: React.FC<LogoProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#0F9D58" d="M8.5 3L1.5 15h5l7-12z" />
    <path fill="#FFCD40" d="M15.5 3h-7l7 12h7z" />
    <path fill="#4285F4" d="M6.5 15l-3 5h14l3-5z" />
  </svg>
)

export const DropboxLogo: React.FC<LogoProps> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#0061FF"
      d="M6.5 3L1 6.6l5.5 3.6L12 6.6 6.5 3zm11 0L12 6.6l5.5 3.6L23 6.6 17.5 3zM1 13.8l5.5 3.6L12 13.8l-5.5-3.6L1 13.8zm16.5-3.6L12 13.8l5.5 3.6 5.5-3.6-5.5-3.6zM12 15.1l-5.5 3.6L12 22l5.5-3.3L12 15.1z"
    />
  </svg>
)

