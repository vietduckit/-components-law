const axios = require('C:/Users/Viet/Desktop/my-nocobase/node_modules/axios');

async function run() {
  const filter = { moduleScope: { $in: ["internal_templates", "internal_template"] } };
  try {
    const res = await axios.get('http://localhost:13000/api/documents:list', {
      params: {
        sort: ['fileIndex', '-createdAt'],
        filter: JSON.stringify(filter),
        appends: ['fileAttachment', 'internalCompany', 'createdBy', 'updatedBy', 'internalTemplates']
      }
    });
    console.log("Documents fetched count:", res.data?.data?.length);
    if (res.data?.data?.length > 0) {
      const doc = res.data.data[0];
      console.log("Keys in first document:", Object.keys(doc));
      console.log("createdAt:", doc.createdAt);
      console.log("updatedAt:", doc.updatedAt);
      console.log("uploadedAt:", doc.uploadedAt);
      console.log("fileAttachment:", doc.fileAttachment);
    }
  } catch (e) {
    console.error("API error status:", e.response?.status);
    console.error("API error data:", e.response?.data);
    console.error("API error message:", e.message);
  }
}

run();
