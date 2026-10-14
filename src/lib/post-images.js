export const POST_IMAGES_BUCKET = "post-images";
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_MAX_COUNT = 8;

const POST_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const POST_IMAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+$/i;

export function isProjectPostImageUrl(url) {
  const value = String(url ?? "").trim();

  if (!value || /[\u0000-\u001F\u007F\\]/.test(value) || value.includes("..")) {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) {
    return false;
  }

  let base;
  let parsed;

  try {
    base = new URL(supabaseUrl);
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.origin !== base.origin || parsed.username || parsed.password) {
    return false;
  }

  if (parsed.search || parsed.hash || parsed.protocol !== base.protocol) {
    return false;
  }

  const prefix = "/storage/v1/object/public/post-images/";

  if (!parsed.pathname.startsWith(prefix)) {
    return false;
  }

  let rest = parsed.pathname.slice(prefix.length);

  try {
    rest = decodeURIComponent(rest);
  } catch {
    return false;
  }

  if (rest.includes("..") || rest.includes("\\") || rest.includes("//")) {
    return false;
  }

  return POST_IMAGE_PATH.test(rest);
}

export function normalizePostImageUrls(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((url) => String(url ?? "").trim()).filter((url) => isProjectPostImageUrl(url));
}

export function postImageExtension(file) {
  return POST_IMAGE_EXTENSIONS[file?.type] || "";
}

export function postImageObjectPath(userId, file) {
  const ext = postImageExtension(file);
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${userId}/post-${nonce}.${ext}`;
}

export function validatePostImageFile(file) {
  if (!file) {
    return "사진을 골라 주세요.";
  }

  if (!POST_IMAGE_EXTENSIONS[file.type]) {
    return "jpeg, png, webp, gif 사진만 담을 수 있습니다.";
  }

  if (file.size > POST_IMAGE_MAX_BYTES) {
    return "5MB보다 큰 사진은 담을 수 없습니다.";
  }

  return "";
}

export function postImageErrorMessage(error) {
  const text = String(error?.message ?? "").toLowerCase();

  if (text.includes("size") || text.includes("exceed") || text.includes("too large")) {
    return "5MB보다 큰 사진은 담을 수 없습니다.";
  }

  if (text.includes("mime") || text.includes("type")) {
    return "jpeg, png, webp, gif 사진만 담을 수 있습니다.";
  }

  return "사진을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export function postImagePathFromPublicUrl(url) {
  const value = String(url ?? "").trim();
  const marker = `/object/public/${POST_IMAGES_BUCKET}/`;
  const index = value.indexOf(marker);

  if (index === -1) {
    return "";
  }

  try {
    return decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
  } catch {
    return value.slice(index + marker.length).split("?")[0];
  }
}

export function ownedPostImagePaths(urls, userId) {
  if (!userId) {
    return [];
  }

  const prefix = `${userId}/`;

  return normalizePostImageUrls(urls)
    .map(postImagePathFromPublicUrl)
    .filter((path) => path.startsWith(prefix));
}

export async function uploadPostImages(supabase, userId, files) {
  const urls = [];

  for (const file of files) {
    const path = postImageObjectPath(userId, file);
    const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (error) {
      return { urls, error };
    }

    const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return { urls, error: null };
}

export async function removeOwnedPostImages(supabase, userId, urls) {
  const paths = ownedPostImagePaths(urls, userId);

  if (!paths.length) {
    return null;
  }

  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).remove(paths);
  return error ?? null;
}
