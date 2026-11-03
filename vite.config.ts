/**
 * Vite build, dev server and Vitest config.
 * All ports are locked with strictPort: the browser stores boards per address and port,
 * so a busy port must fail the command rather than move it.
 * `vite preview --mode lan` (npm run start:lan) serves the built app over HTTPS on port 4444
 * to the local network, with the mkcert certificate in .certs/. Port 4174 stays plain
 * localhost, so its boards are never touched.
 */
/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type PreviewOptions } from 'vite';

const CERT_DIR = fileURLToPath(new URL('./.certs/', import.meta.url));
const CERT_FILE = `${CERT_DIR}lan.pem`;
const KEY_FILE = `${CERT_DIR}lan-key.pem`;

/** The HTTPS preview server for the local network. Fails with a clear message without a certificate. */
function lanPreview(): PreviewOptions {
  if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) {
    throw new Error(
      `No certificate in .certs/. Run: mkcert -cert-file .certs/lan.pem -key-file .certs/lan-key.pem <this machine's LAN address> localhost`,
    );
  }
  return {
    port: 4444,
    strictPort: true,
    host: true,
    https: { cert: readFileSync(CERT_FILE), key: readFileSync(KEY_FILE) },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5174, strictPort: true },
  preview: mode === 'lan' ? lanPreview() : { port: 4174, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    passWithNoTests: true,
  },
}));
