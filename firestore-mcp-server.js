#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// إعدادات Firebase - استبدل بمعلوماتك
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';
const API_KEY = process.env.FIREBASE_API_KEY || 'your-api-key';

const server = new Server(
  {
    name: 'firestore-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// تعريف الأدوات المتاحة لـ Claude
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'firestore_read_collection',
        description: 'قراءة جميع المستندات من مجموعة في Firestore',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'اسم المجموعة المراد قراءتها (مثل: Stores, products, users)',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'firestore_read_document',
        description: 'قراءة مستند محدد من Firestore',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'اسم المجموعة',
            },
            document: {
              type: 'string',
              description: 'معرف المستند',
            },
          },
          required: ['collection', 'document'],
        },
      },
      {
        name: 'firestore_write_document',
        description: 'كتابة مستند إلى Firestore',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'اسم المجموعة',
            },
            document: {
              type: 'string',
              description: 'معرف المستند',
            },
            data: {
              type: 'object',
              description: 'البيانات المراد كتابتها',
            },
          },
          required: ['collection', 'document', 'data'],
        },
      },
      {
        name: 'firestore_delete_document',
        description: 'حذف مستند من Firestore',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'اسم المجموعة',
            },
            document: {
              type: 'string',
              description: 'معرف المستند',
            },
          },
          required: ['collection', 'document'],
        },
      },
    ],
  };
});

// تنفيذ الأدوات
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'firestore_read_collection') {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${args.collection}?key=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return {
          content: [
            {
              type: 'text',
              text: `خطأ: ${data.error.message}`,
            },
          ],
          isError: true,
        };
      }

      // استخراج البيانات من المستندات
      const documents = data.documents || [];
      const result = documents.map(doc => {
        const docId = doc.name.split('/').pop();
        const fields = doc.fields || {};
        
        // تحويل البيانات من تنسيق Firestore إلى تنسيق عادي
        const convertedData = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value.stringValue !== undefined) convertedData[key] = value.stringValue;
          else if (value.integerValue !== undefined) convertedData[key] = parseInt(value.integerValue);
          else if (value.booleanValue !== undefined) convertedData[key] = value.booleanValue;
          else if (value.doubleValue !== undefined) convertedData[key] = parseFloat(value.doubleValue);
          else if (value.timestampValue !== undefined) convertedData[key] = value.timestampValue;
          else if (value.arrayValue !== undefined) convertedData[key] = value.arrayValue;
          else if (value.mapValue !== undefined) convertedData[key] = value.mapValue;
          else if (value.nullValue !== undefined) convertedData[key] = null;
          else convertedData[key] = value;
        }
        
        return {
          id: docId,
          ...convertedData
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `خطأ في قراءة المجموعة: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'firestore_read_document') {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${args.collection}/${args.document}?key=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return {
          content: [
            {
              type: 'text',
              text: `خطأ: ${data.error.message}`,
            },
          ],
          isError: true,
        };
      }

      // تحويل البيانات من تنسيق Firestore
      const fields = data.fields || {};
      const convertedData = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value.stringValue !== undefined) convertedData[key] = value.stringValue;
        else if (value.integerValue !== undefined) convertedData[key] = parseInt(value.integerValue);
        else if (value.booleanValue !== undefined) convertedData[key] = value.booleanValue;
        else if (value.doubleValue !== undefined) convertedData[key] = parseFloat(value.doubleValue);
        else if (value.timestampValue !== undefined) convertedData[key] = value.timestampValue;
        else if (value.arrayValue !== undefined) convertedData[key] = value.arrayValue;
        else if (value.mapValue !== undefined) convertedData[key] = value.mapValue;
        else if (value.nullValue !== undefined) convertedData[key] = null;
        else convertedData[key] = value;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(convertedData, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `خطأ في قراءة المستند: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'firestore_write_document') {
    try {
      // تحويل البيانات إلى تنسيق Firestore
      const firestoreData = {};
      for (const [key, value] of Object.entries(args.data)) {
        if (typeof value === 'string') {
          firestoreData[key] = { stringValue: value };
        } else if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            firestoreData[key] = { integerValue: value };
          } else {
            firestoreData[key] = { doubleValue: value };
          }
        } else if (typeof value === 'boolean') {
          firestoreData[key] = { booleanValue: value };
        } else if (value === null) {
          firestoreData[key] = { nullValue: null };
        } else if (Array.isArray(value)) {
          firestoreData[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
        } else if (typeof value === 'object') {
          firestoreData[key] = { mapValue: { fields: value } };
        }
      }

      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${args.collection}/${args.document}?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: firestoreData
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        return {
          content: [
            {
              type: 'text',
              text: `خطأ في الكتابة: ${result.error.message}`,
            },
          ],
          isError: true,
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `تم كتابة البيانات بنجاح في المستند: ${args.document}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `خطأ في كتابة البيانات: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'firestore_delete_document') {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${args.collection}/${args.document}?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `تم حذف المستند بنجاح: ${args.document}`,
            },
          ],
        };
      } else {
        const error = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: `خطأ في حذف المستند: ${error.error?.message || 'خطأ غير معروف'}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `خطأ في حذف المستند: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`أداة غير معروفة: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Firestore MCP server running on stdio');
}

main().catch(console.error);
