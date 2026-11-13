import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Upload an audio recording for a journal entry to Firebase Storage
 * Path: users/{uid}/voiceLogs/{journalId}/audio.webm
 */
export async function uploadAudioRecording(
  uid: string,
  journalId: string,
  audioBlob: Blob
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    const storagePath = `users/${uid}/voiceLogs/${journalId}/audio.webm`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, audioBlob, { contentType: 'audio/webm' });
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn('Failed to upload audio to Firebase Storage:', err);
    throw err;
  }
}

/**
 * Upload an inspection photo for a journal entry or hive to Firebase Storage
 * Path: users/{uid}/photos/{journalId}/{filename}
 */
export async function uploadInspectionPhoto(
  uid: string,
  journalId: string,
  file: File
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${uid}/photos/${journalId}/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn('Failed to upload photo to Firebase Storage:', err);
    throw err;
  }
}

/**
 * Upload a product representative photo to Firebase Storage
 * Path: users/{uid}/products/{productId}/photo_{timestamp}_{cleanFileName}
 */
export async function uploadProductPhoto(
  uid: string,
  productId: string,
  file: File
): Promise<{ downloadUrl: string; storagePath: string }> {
  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${uid}/products/${productId}/photo_${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn('Failed to upload product photo to Firebase Storage:', err);
    throw err;
  }
}

