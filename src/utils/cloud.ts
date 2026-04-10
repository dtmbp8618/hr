// Wrapper for Telegram CloudStorage
function getCloudStorage() {
  return (window as any).Telegram?.WebApp?.CloudStorage;
}

export function saveToCloud(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) {
      console.warn("No CloudStorage! Falling back to localStore:", key);
      localStorage.setItem(key, value);
      return resolve(true);
    }
    cs.setItem(key, value, (err: any, success: boolean) => {
      if (err) console.error("Cloud Save Error:", err);
      resolve(!!success);
    });
  });
}

export function loadFromCloud(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) {
      return resolve(localStorage.getItem(key));
    }
    cs.getItem(key, (err: any, value: string) => {
      if (err) console.error("Cloud Load Error:", err);
      resolve(value || null);
    });
  });
}

// Chunking for large Array payloads
export async function saveChunkedArray(baseKey: string, arr: any[], chunkSize: number = 20) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  
  await saveToCloud(`${baseKey}_count`, chunks.length.toString());
  
  for (let i = 0; i < chunks.length; i++) {
    await saveToCloud(`${baseKey}_${i}`, JSON.stringify(chunks[i]));
  }
}

export async function loadChunkedArray(baseKey: string): Promise<any[]> {
  const countStr = await loadFromCloud(`${baseKey}_count`);
  if (!countStr) return [];
  
  const count = parseInt(countStr);
  let allItems: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const chunkStr = await loadFromCloud(`${baseKey}_${i}`);
    if (chunkStr) {
      try {
        allItems = allItems.concat(JSON.parse(chunkStr));
      } catch (e) {
        console.error("Failed parsing chunk", i);
      }
    }
  }
  
  return allItems;
}
