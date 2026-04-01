import axios from 'axios';
import { config } from '../config';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SttResult {
  transcript: string;
  unrecognized: boolean;
  retryPrompt?: string;
  textFallback?: boolean;
}

type SupportedLanguage = 'en' | 'hi' | 'pa';

// ─── Language code mapping ────────────────────────────────────────────────────

const LANGUAGE_CODE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  pa: 'pa-IN',
};

// ─── Google Cloud API response types ─────────────────────────────────────────

interface SttAlternative {
  transcript: string;
  confidence?: number;
}

interface SttResult_GCP {
  alternatives?: SttAlternative[];
}

interface SttResponse {
  results?: SttResult_GCP[];
}

interface TtsResponse {
  audioContent: string; // base64-encoded MP3
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Convert audio blob to text using Google Cloud Speech-to-Text.
 * Supports English (en-IN), Hindi (hi-IN), and Punjabi (pa-IN).
 * Returns an unrecognized result with retry prompt if no transcript is found.
 */
export async function speechToText(
  audioBlob: Buffer,
  language: SupportedLanguage
): Promise<SttResult> {
  const languageCode = LANGUAGE_CODE_MAP[language];
  const audioContent = audioBlob.toString('base64');

  let response: { data: SttResponse };

  try {
    response = await axios.post<SttResponse>(
      `https://speech.googleapis.com/v1/speech:recognize?key=${config.googleCloudApiKey}`,
      {
        config: {
          languageCode,
          encoding: 'WEBM_OPUS',
        },
        audio: {
          content: audioContent,
        },
      }
    );
  } catch (err: unknown) {
    throw new AppError('STT_ERROR', 'Speech-to-text service failed');
  }

  const results = response.data.results;
  const transcript = results?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';

  if (!transcript) {
    return {
      transcript: '',
      unrecognized: true,
      retryPrompt: 'Could not recognize speech. Please try again.',
      textFallback: true,
    };
  }

  return {
    transcript,
    unrecognized: false,
  };
}

/**
 * Convert text to speech using Google Cloud Text-to-Speech.
 * Returns the audio content as a Buffer (MP3).
 */
export async function textToSpeech(
  text: string,
  language: SupportedLanguage
): Promise<Buffer> {
  const languageCode = LANGUAGE_CODE_MAP[language];

  let response: { data: TtsResponse };

  try {
    response = await axios.post<TtsResponse>(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.googleCloudApiKey}`,
      {
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      }
    );
  } catch (err: unknown) {
    throw new AppError('TTS_ERROR', 'Text-to-speech service failed');
  }

  return Buffer.from(response.data.audioContent, 'base64');
}
