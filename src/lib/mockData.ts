
// Mock data for simulating database responses
// In a real app, this would be replaced with actual API calls to a backend

export interface DataPoint {
  name: string;
  value: number;
}

export const generateMockData = (query: string): Promise<DataPoint[]> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const categories = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
      const countries = ['USA', 'UK', 'Germany', 'France', 'Japan', 'Canada', 'Australia'];
      
      let data: DataPoint[] = [];
      
      // Generate different mock data based on query content
      if (query.toLowerCase().includes('monthly') || query.toLowerCase().includes('month')) {
        // Last 6 months data
        const currentMonth = new Date().getMonth();
        data = Array.from({ length: 6 }, (_, i) => {
          const monthIndex = (currentMonth - 5 + i + 12) % 12; // Go back 5 months
          return {
            name: months[monthIndex],
            value: Math.floor(Math.random() * 5000) + 1000,
          };
        });
      } else if (query.toLowerCase().includes('country') || query.toLowerCase().includes('countries')) {
        // Data by country
        data = countries.map(country => ({
          name: country,
          value: Math.floor(Math.random() * 100),
        }));
      } else if (query.toLowerCase().includes('category') || query.toLowerCase().includes('product')) {
        // Data by product category
        data = categories.map(category => ({
          name: category,
          value: Math.floor(Math.random() * 10000) + 1000,
        }));
      } else if (query.toLowerCase().includes('feature') || query.toLowerCase().includes('engagement')) {
        // Feature engagement data
        data = [
          { name: 'Search', value: Math.floor(Math.random() * 90) + 10 },
          { name: 'Dashboard', value: Math.floor(Math.random() * 90) + 10 },
          { name: 'Reports', value: Math.floor(Math.random() * 90) + 10 },
          { name: 'Analytics', value: Math.floor(Math.random() * 90) + 10 },
          { name: 'Settings', value: Math.floor(Math.random() * 90) + 10 },
        ];
      } else {
        // Generic data
        data = Array.from({ length: 6 }, (_, i) => ({
          name: `Group ${i + 1}`,
          value: Math.floor(Math.random() * 1000) + 100,
        }));
      }
      
      resolve(data);
    }, 1500); // Simulate API delay
  });
};

// Mock SQL generation based on natural language query
export const generateMockSQL = (query: string): Promise<{sql: string, success: boolean}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Random chance of "error" to demonstrate error handling flow
      const isSuccess = Math.random() > 0.2;
      
      let sql = '';
      
      if (query.toLowerCase().includes('monthly') || query.toLowerCase().includes('month')) {
        sql = `SELECT 
  DATE_TRUNC('month', created_at) AS month,
  COUNT(DISTINCT user_id) AS monthly_active_users
FROM user_sessions
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC
LIMIT 6;`;
      } else if (query.toLowerCase().includes('country') || query.toLowerCase().includes('countries')) {
        sql = `SELECT 
  countries.name,
  COUNT(conversions.id) / COUNT(DISTINCT sessions.id) * 100 AS conversion_rate
FROM sessions
JOIN users ON sessions.user_id = users.id
JOIN countries ON users.country_id = countries.id
LEFT JOIN conversions ON sessions.id = conversions.session_id
GROUP BY countries.name
ORDER BY conversion_rate DESC;`;
      } else if (query.toLowerCase().includes('category') || query.toLowerCase().includes('product')) {
        sql = `SELECT 
  product_categories.name,
  SUM(CASE WHEN orders.created_at BETWEEN '2023-01-01' AND '2023-03-31' THEN order_items.price * order_items.quantity ELSE 0 END) AS q1_revenue,
  SUM(CASE WHEN orders.created_at BETWEEN '2023-04-01' AND '2023-06-30' THEN order_items.price * order_items.quantity ELSE 0 END) AS q2_revenue
FROM order_items
JOIN products ON order_items.product_id = products.id
JOIN product_categories ON products.category_id = product_categories.id
JOIN orders ON order_items.order_id = orders.id
WHERE orders.created_at BETWEEN '2023-01-01' AND '2023-06-30'
GROUP BY product_categories.name
ORDER BY q1_revenue + q2_revenue DESC;`;
      } else if (query.toLowerCase().includes('feature') || query.toLowerCase().includes('engagement')) {
        sql = `SELECT 
  features.name,
  COUNT(feature_events.id) AS total_interactions,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(feature_events.id) / COUNT(DISTINCT user_id) AS avg_interactions_per_user
FROM feature_events
JOIN features ON feature_events.feature_id = features.id
WHERE feature_events.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY features.name
ORDER BY avg_interactions_per_user DESC;`;
      } else {
        sql = `SELECT 
  dimension.name,
  SUM(metrics.value) AS total_value
FROM fact_table
JOIN dimension ON fact_table.dimension_id = dimension.id
JOIN metrics ON fact_table.metric_id = metrics.id
WHERE fact_table.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY dimension.name
ORDER BY total_value DESC
LIMIT 10;`;
      }
      
      resolve({
        sql: isSuccess ? sql : '',
        success: isSuccess
      });
    }, 2000);
  });
};
