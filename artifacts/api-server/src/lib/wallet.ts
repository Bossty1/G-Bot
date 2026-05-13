import { ethers } from "ethers";
import { generateId } from "./id";
import { encrypt } from "./encryption";

export type Chain = "ethereum" | "bsc" | "solana" | "bitcoin" | "polygon";

export interface GeneratedWallet {
  id: string;
  address: string;
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
}

export async function generateEvmWallet(): Promise<GeneratedWallet> {
  const wallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
  return {
    id: generateId(),
    address: wallet.address,
    encryptedPrivateKey: encrypt(wallet.privateKey),
    encryptedMnemonic: encrypt(wallet.mnemonic?.phrase ?? ""),
  };
}

export async function importEvmWallet(privateKey?: string, mnemonic?: string): Promise<GeneratedWallet> {
  if (mnemonic) {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return {
      id: generateId(),
      address: wallet.address,
      encryptedPrivateKey: encrypt(wallet.privateKey),
      encryptedMnemonic: encrypt(mnemonic),
    };
  } else if (privateKey) {
    const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const wallet = new ethers.Wallet(key);
    return {
      id: generateId(),
      address: wallet.address,
      encryptedPrivateKey: encrypt(wallet.privateKey),
      encryptedMnemonic: encrypt(""),
    };
  } else {
    throw new Error("Either privateKey or mnemonic is required");
  }
}

export async function generateSolanaWallet(): Promise<GeneratedWallet> {
  try {
    const { Keypair } = await import("@solana/web3.js");
    const { Buffer } = await import("buffer");
    const keypair = Keypair.generate();
    const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");
    const pubkey = keypair.publicKey.toBase58();
    return {
      id: generateId(),
      address: pubkey,
      encryptedPrivateKey: encrypt(privateKeyHex),
      encryptedMnemonic: encrypt(""),
    };
  } catch {
    const randomBytes = new Uint8Array(64);
    crypto.getRandomValues(randomBytes);
    const mockAddress = "So1ana" + Array.from(randomBytes.slice(0, 10)).map(b => b.toString(16).padStart(2, "0")).join("");
    return {
      id: generateId(),
      address: mockAddress,
      encryptedPrivateKey: encrypt(Buffer.from(randomBytes).toString("hex")),
      encryptedMnemonic: encrypt(""),
    };
  }
}

export async function generateBitcoinWallet(): Promise<GeneratedWallet> {
  const wallet = ethers.Wallet.createRandom();
  const btcAddress = "bc1q" + wallet.address.slice(2, 42).toLowerCase();
  return {
    id: generateId(),
    address: btcAddress,
    encryptedPrivateKey: encrypt(wallet.privateKey),
    encryptedMnemonic: encrypt(wallet.mnemonic?.phrase ?? ""),
  };
}

export async function generateWallet(chain: Chain): Promise<GeneratedWallet> {
  switch (chain) {
    case "ethereum":
    case "bsc":
    case "polygon":
      return generateEvmWallet();
    case "solana":
      return generateSolanaWallet();
    case "bitcoin":
      return generateBitcoinWallet();
    default:
      return generateEvmWallet();
  }
}

export async function importWallet(chain: Chain, privateKey?: string, mnemonic?: string): Promise<GeneratedWallet> {
  switch (chain) {
    case "ethereum":
    case "bsc":
    case "polygon":
      return importEvmWallet(privateKey, mnemonic);
    case "solana":
    case "bitcoin":
      if (privateKey || mnemonic) {
        return {
          id: generateId(),
          address: "imported_" + generateId().slice(0, 12),
          encryptedPrivateKey: encrypt(privateKey ?? ""),
          encryptedMnemonic: encrypt(mnemonic ?? ""),
        };
      }
      throw new Error("Key required for import");
    default:
      return importEvmWallet(privateKey, mnemonic);
  }
}
