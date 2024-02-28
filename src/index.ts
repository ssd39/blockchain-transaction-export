import {
  createPublicClient,
  http,
  Hash,
  Transaction,
  TransactionReceipt,
} from "viem";
import { redstone } from "./custom_chain";
import { BigQuery } from "@google-cloud/bigquery";
import { schema } from "./schema";

const START_BLOCK_NUMBER = BigInt(0);
const FETCH_MISSED_BLOCKS = true
const BULK_ROWS_COUNT = 5;
const BIGQUERY_DATASET = "crypto_redstone";
const BIGQUERY_TABLE = "transactions";
const GOGOLE_PROJECT_ID = "stoked-depth-347817";

const client = createPublicClient({
  chain: redstone,
  transport: http(),
});

const options = {
  keyFilename: "./service_account.json",
  projectId: GOGOLE_PROJECT_ID,
};

const bigquery = new BigQuery(options);

type CustomTransaction = Transaction & {
  blockTimestamp: bigint;
  gasUsed: bigint;
} & TransactionReceipt;

// Note: no need to worry about concurrent access of buffer as js is single threaded
let tranactionsBuffer: CustomTransaction[] = [];

async function QueueTrancations(
  tranasctionsHash: Hash[],
  blockTimeStamp: bigint
) {
  for (const transactionHash of tranasctionsHash) {
    const transactionReceipt = await client.getTransactionReceipt({
      hash: transactionHash,
    });

    const transaction = (await client.getTransaction({
      hash: transactionHash,
    })) as CustomTransaction;
    transaction.gasUsed = transactionReceipt.gasUsed;
    transaction.blockTimestamp = blockTimeStamp;
    transaction.root = transactionReceipt.root;
    transaction.cumulativeGasUsed = transactionReceipt.cumulativeGasUsed;
    transaction.effectiveGasPrice = transactionReceipt.effectiveGasPrice;
    transaction.status = transactionReceipt.status;
    transaction.contractAddress = transactionReceipt.contractAddress;
    tranactionsBuffer.push(transaction);
  }
}

async function retriveMissedBlocks() {
  const latestBlockNumber = await client.getBlockNumber();
  for (let i = START_BLOCK_NUMBER; i <= latestBlockNumber; i++) {
    try {
      const block = await client.getBlock({
        blockNumber: i,
      });
      await QueueTrancations(block.transactions, block.timestamp);
    } catch (e) {
      console.error(`BlockNumber: ${i}`);
      console.error(e);
    }
  }
}

async function StoreBulkTransactions() {
  if (tranactionsBuffer.length >= BULK_ROWS_COUNT) {
    try {
      console.log("New Bulk exporting started!");
      let i = 0;
      const rows: schema[] = tranactionsBuffer.map((val): schema => {
        i += 1;
        return {
          hash: val.hash,
          nonce: val.nonce,
          transaction_index: val.transactionIndex,
          from_address: val.from,
          to_address: val.to,
          value: val.value.toString(),
          gas: val.gas.toString(),
          gas_price: val.gasPrice?.toString(),
          input: val.input,
          block_timestamp: val.blockTimestamp.toString(),
          block_number: val.blockNumber.toString(),
          block_hash: val.blockHash,
          max_fee_per_gas: val.maxFeePerGas?.toString(),
          max_priority_fee_per_gas: val.maxPriorityFeePerGas?.toString(),
          transaction_type: val.type,
          receipt_gas_used: val.gasUsed.toString(),
          receipt_cumulative_gas_used: val.cumulativeGasUsed.toString(),
          receipt_effective_gas_price: val.effectiveGasPrice.toString(),
          receipt_status: val.status == "success" ? 1 : 0,
          receipt_root: val.root,
          receipt_contract_address: val.contractAddress,
        };
      });

      // Insert data into a table
      await bigquery
        .dataset(BIGQUERY_DATASET)
        .table(BIGQUERY_TABLE)
        .insert(rows);

      tranactionsBuffer = tranactionsBuffer.slice(i + 1);
    } catch (e) {
      console.error("Error: StoreBulkTransactions");
      console.error(JSON.stringify(e));
    }
  }
}

async function main(): Promise<void> {
  // will retrive the missed blocks from START_BLOCK_NUMBER till current block
  if (FETCH_MISSED_BLOCKS) {
    retriveMissedBlocks();
  }

  // logic to get latest published blocks
  client.watchBlocks({
    onBlock: (block) => QueueTrancations(block.transactions, block.timestamp),
  });

  // implementig bulk store to prevent un necesseary cost and repeatative network req to bigquery
  setInterval(StoreBulkTransactions, 1000);
}

main();
