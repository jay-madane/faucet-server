import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

dotenv.config({
    path: "./.env"
});

const PORT = process.env.PORT;

const app = express();

app.use(cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.status(200).json({ "success": "running" });
});

app.post("/airdrop", async (req, res) => {
    const { network, amount, address } = req.body;

    if(!amount || isNaN(amount) || amount <= 0 || amount >= 10) {
        return res.status(400).json({ error : "Enter appropriate amount of SOL. (Between 0.1 and 10)" });
    }

    if(!address || !isValidSolanaAddress(address)) {
        return res.status(400).json({ error: "Enter a valid recipient address." });
    }

    if(!network && (network !== "devnet" || network !== "testnet")) {
        return res.status(400).json({ error: "Select a valid network." });
    }

    try {
        const connection = new Connection(clusterApiUrl(network), "confirmed");
        const recipientPublicKey = new PublicKey(address);

        const signature = await connection.requestAirdrop(
            recipientPublicKey,
            amount * LAMPORTS_PER_SOL
        );

        const confirmation = await connection.confirmTransaction({
            signature,
            commitment: "confirmed"
        });

        if (confirmation.value.err) {
            throw new Error("Transaction failed during confirmation.");
        }

        return res.status(200).json({ 
            success : `Successfully airdropped ${amount} SOL to ${address}`,
            signature,
            explorerLink: `https://explorer.solana.com/tx/${signature}?cluster=${network}`
        });

    } catch (error) {
        console.error('Error during airdrop: ', error.message);
        return res.status(500).json({ 
            error : "Internal Server Error",
            detail : error.message
        });
    }
});

function isValidSolanaAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});