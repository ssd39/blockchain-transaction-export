import {
  Address,
  Hash,
  TransactionEIP1559,
  TransactionEIP2930,
  TransactionEIP4844,
  TransactionLegacy,
} from "viem";

export interface schema {
  hash: Hash;
  nonce: number;
  transaction_index: number | null;
  from_address: Address | null;
  to_address?: Address | null;
  value?: string;
  gas?: string;
  gas_price?: string | undefined;
  input?: string;
  receipt_cumulative_gas_used?: string;
  receipt_gas_used?: string;
  receipt_contract_address?: Address | null;
  receipt_root?: string;
  receipt_status?: number;
  block_timestamp: string;
  block_number: string | null;
  block_hash: Hash | null;
  max_fee_per_gas?: string | undefined;
  max_priority_fee_per_gas?: string | undefined;
  transaction_type?: number;
  receipt_effective_gas_price?: string;
}
