require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const { Writable } = require("stream");

const { connectDb } = require("./src/config/db");
const User = require("./src/models/userModel");

let hideInput = false;

const terminalOutput = new Writable({
  write(chunk, encoding, callback) {
    if (!hideInput) {
      process.stdout.write(chunk, encoding);
    }

    callback();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: terminalOutput,
  terminal: true,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    hideInput = true;

    rl.question("", (answer) => {
      hideInput = false;
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log("\nTruee — Create Super Admin\n");

    const name = await ask("Apna naam: ");
    const email = (await ask("Apna email: ")).toLowerCase();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Sahi naam aur email bharo.");
    }

    const password = await askPassword(
      "Naya password (typing screen par nahi dikhegi): "
    );

    const confirmPassword = await askPassword(
      "Wahi password dobara likho: "
    );

    if (password.length < 12) {
      throw new Error(
        "Password kam se kam 12 characters ka rakho."
      );
    }

    if (password !== confirmPassword) {
      throw new Error("Dono passwords match nahi hue.");
    }

    console.log("\nDatabase connect ho raha hai...");

    await connectDb();
    await mongoose.connection.asPromise();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(
        "\nIs email ka account pehle se hai. Koi change nahi kiya."
      );
      console.log(`Existing role: ${existingUser.role}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "super-admin",
      isActive: true,
      isFirstLogin: false,
    });

    console.log("\nSuper Admin account ban gaya!");
    console.log(`Login email: ${email}`);
    console.log(
      "Ab /login par isi email aur apne naye password se login karo."
    );
  } catch (error) {
    console.error(
      "\nSetup complete nahi hua:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main();