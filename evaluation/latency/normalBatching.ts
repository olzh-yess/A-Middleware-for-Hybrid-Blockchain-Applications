const fs = require('fs');
const path = require('path');
const exponentialRandom = (lambda: any) => (-Math.log(1 - Math.random()) / lambda);


const simulateBatchFill = (transactionRate: any, batchSize: any) => {
  let elapsedTime = 0;
  for (let i = 0; i < batchSize; i++) {
    const timeBetweenTransactions = exponentialRandom(transactionRate);
    elapsedTime += timeBetweenTransactions;
  }
  return elapsedTime;
};

const testBatchFillTimes = (transactionRate: any, maxBatchSize: any) => {
  const batchFillTimes: any[] = [];
  for (let batchSize = 1; batchSize <= maxBatchSize; batchSize++) {
    const fillTime = simulateBatchFill(transactionRate, batchSize);
    batchFillTimes.push({
      batchSize: batchSize,
      timeToFill: fillTime,
    });
  }
  return batchFillTimes;
};

const calculateVariance = (data: any) => {
  const mean = data.reduce((sum: any, item: any) => sum + item.timeToFill, 0) / data.length;
  const variance = data.reduce((sum: any, item: any) => sum + Math.pow(item.timeToFill - mean, 2), 0) / data.length;
  return variance;
};

const main = () => {
  // Transactions per minute
  const highThroughput = 100000 / (24 * 60);
  const mediumThroughput = 1;
  const lowThroughput = (3.35 / 24) / 60;

  const maxBatchSize = 100;

  const highResults = testBatchFillTimes(highThroughput, maxBatchSize);
  const highVariance = calculateVariance(highResults);

  const mediumResults = testBatchFillTimes(mediumThroughput, maxBatchSize);
  const mediumVariance = calculateVariance(mediumResults);

  const lowResults = testBatchFillTimes(lowThroughput, maxBatchSize);
  const lowVariance = calculateVariance(lowResults);

  const results = {
    high: {
      throughput: '100,000 transactions per day',
      variance: highVariance,
      data: highResults,
    },
    medium: {
      throughput: '1 transaction per minute',
      variance: mediumVariance,
      data: mediumResults,
    },
    low: {
      throughput: '3.35 transactions per day',
      variance: lowVariance,
      data: lowResults,
    },
  };

  const jsonOutput = JSON.stringify(results, null, 2);
  const filePath = path.join(__dirname, "data", "normal-batching.json");

  fs.writeFile(filePath, jsonOutput, (err: any) => {
    if (err) {
      console.error('Error saving the JSON file:', err);
    } else {
      console.log('Batch fill times are successfully saved to batch_fill_times.json');
    }
  });
};

main();