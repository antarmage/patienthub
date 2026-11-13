import { FACE_MODEL, faceDescriptorSchema } from "../../../../lib/db/src/face-attendance";

let loaded: Promise<typeof import("@vladmandic/face-api/dist/face-api.esm.js")> | undefined;

async function loadFaceModels() {
  if (!loaded) {
    loaded = (async () => {
      const api = await import("@vladmandic/face-api/dist/face-api.esm.js");
      const url = `${import.meta.env.BASE_URL}face-models`;
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(url),
        api.nets.faceLandmark68Net.loadFromUri(url),
        api.nets.faceRecognitionNet.loadFromUri(url),
      ]);
      return api;
    })().catch((error: unknown) => { loaded = undefined; throw error; });
  }
  return loaded;
}

export async function describeAttendanceFace(input: HTMLVideoElement | HTMLImageElement) {
  const api = await loadFaceModels();
  const faces = await api.detectAllFaces(input, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.7 }))
    .withFaceLandmarks().withFaceDescriptors();
  if (faces.length !== 1) throw new Error(faces.length ? "Only one person should be visible. Please try again." : "No clear face found. Face the camera in good lighting and try again.");
  return { descriptor: faceDescriptorSchema.parse(Array.from(faces[0].descriptor)), model: FACE_MODEL };
}

export async function describeEnrollmentPhoto(file: File) {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG or PNG staff photo up to 5 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await describeAttendanceFace(image);
  } finally { URL.revokeObjectURL(url); }
}
