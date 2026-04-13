const KVDB_BUCKET = '4ZE8qRRS6dbdgLueZHqvHm';
const KVDB_URL = `https://kvdb.io/${KVDB_BUCKET}`;

export async function saveToCloud(data: any): Promise<boolean> {
  try {
    const res = await fetch(`${KVDB_URL}/hr_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    console.error("Cloud Save Error:", err);
    return false;
  }
}

export async function loadFromCloud(): Promise<any> {
  try {
    const res = await fetch(`${KVDB_URL}/hr_data`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.error("Cloud Load Error:", err);
    return null;
  }
}
