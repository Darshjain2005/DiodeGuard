// Mock Database connection for DiodeGuard SIH Prototype
// The backend Python API stores the historical data in memory.
// This mock prevents the Node.js server from crashing on Render when no Postgres is available.

const pool = {
  query: async (text, params) => {
    // If it's the logActivity insert, return a mock row so Socket.IO can emit it
    if (text.includes('INSERT INTO activities')) {
      return {
        rows: [{
          id: Date.now(),
          type: params[0],
          text: params[1],
          created_at: new Date()
        }]
      };
    }
    // For any other queries, return an empty array
    return { rows: [], rowCount: 0 };
  }
};

export default pool;
