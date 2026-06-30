/**
 * Centralized bot copy. Plain text with legacy Markdown (single * for bold).
 * Avoid underscores in v0.1.0 messages so legacy Markdown does not misparse.
 */
export const BOT_MESSAGES = {
  START: [
    '👋 Welcome to *Project Quartermaster* — the ASE Laboratory inventory bot.',
    '',
    'This is the v0.1.0 foundation. Available commands:',
    '',
    '/start — Show this welcome message',
    '/help — Show help and the command list',
    '/me — Show your registered account info',
    '',
    'If you are not registered yet, please contact the lab admin.',
  ].join('\n'),

  HELP: [
    '*Project Quartermaster — Help*',
    '',
    'Available commands in this version:',
    '',
    '/start — Welcome message',
    '/help — This help message',
    '/me — Show your account and role',
    '',
    'Access to inventory features depends on your assigned role.',
    'Contact the lab admin if you need access.',
  ].join('\n'),

  NOT_REGISTERED:
    'You are not registered. Please contact the admin to get access.',
  INACTIVE: 'Your account is inactive. Please contact the admin.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  GENERIC_ERROR: 'Something went wrong. Please try again later.',
} as const;
