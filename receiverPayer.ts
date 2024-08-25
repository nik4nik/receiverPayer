import "dotenv/config";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

function getKeyPair(n) {
	let key = process.env["SECRET_KEY" + n];
	if (key !== undefined)
		return Keypair.fromSecretKey(
			Uint8Array.from(
				JSON.parse(key)));
	console.log(`Add SECRET_KEY${n} to .env!`);
	process.exit(1);
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const sender = getKeyPair(1);
const recipient = getKeyPair(2);

// Адрес токена
const tokenMintAddress = new PublicKey('GLCkK1D5aKAaeeQSLRXHLzdWrrkmad2rJXBD3A5mWTis');

async function main() {
  // Создаем ассоциированный токеновый аккаунт для отправителя, если его еще нет
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    tokenMintAddress,
    sender.publicKey
  );

  // Создаем ассоциированный токеновый аккаунт для получателя, если его еще нет
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    tokenMintAddress,
    recipient.publicKey
  );

  // Mint 1 new token to the "senderTokenAccount" account we just created
  let signatureMinting = await mintTo(
      connection,
      sender,
      tokenMintAddress,
      senderTokenAccount.address,
      sender.publicKey,
      1000000000
  );
  console.log('mint tx:', signatureMinting);

  // Создаем инструкцию перевода токенов
  const transferInstruction = createTransferInstruction(
    senderTokenAccount.address, // Адрес отправителя токенов
    recipientTokenAccount.address, // Адрес получателя токенов
    sender.publicKey, // Отправитель
    1000000, // Количество токенов для перевода (например, 1 токен = 1000000 micro-tokens)
    [], // Необходимые подписи (будут добавлены позже)
    TOKEN_PROGRAM_ID
  );

  // Создаем транзакцию
  let transaction = new Transaction().add(transferInstruction);

  // Подписываем транзакцию отправителем
  transaction.partialSign(sender);

  // Серилизуем сообщение
  const serializedTransaction = transaction.serializeMessage();

  // Подписываем транзакцию получателем, который также оплатит комиссию
  transaction.addSignature(recipient.publicKey, recipient.sign(serializedTransaction).signature);

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [recipient], // Получатель подписывает и оплачивает комиссию
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      commitment: 'confirmed',
    }
  );

  console.log('Транзакция успешно выполнена:', signature);
}

main().catch(err => {
  console.error(err);
});
