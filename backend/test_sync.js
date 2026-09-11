const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:5000";

async function runTests() {
  console.log("=== Starting YouTube Watch Party Real-Time Sync Tests ===\n");

  let hostSocket = io(SERVER_URL);
  let guestSocket = io(SERVER_URL);

  let testRoomId = null;

  try {
    console.log("Test 1: Host creates room...");
    await new Promise((resolve, reject) => {
      hostSocket.emit(
        "join_room",
        { username: "Saransh", isCreating: true },
        (res) => {
          if (res && res.success) {
            testRoomId = res.roomId;
            console.log(`✓ Room created successfully! Room ID: ${testRoomId}`);
            resolve();
          } else {
            reject(new Error("Failed to create room"));
          }
        }
      );
    });

    console.log("\nTest 2: Guest joins room as Participant...");
    await new Promise((resolve) => {
      hostSocket.once("user_joined", (data) => {
        console.log(`✓ Host received 'user_joined' notification for: ${data.username} (${data.role})`);
        resolve();
      });

      guestSocket.emit("join_room", {
        roomId: testRoomId,
        username: "Rahul",
        isCreating: false
      });
    });

    console.log("\nTest 3: Host triggers 'play'...");
    await new Promise((resolve) => {
      guestSocket.once("play", (data) => {
        console.log(`✓ Guest received 'play' event at ${data.currentTime}s triggered by ${data.by}`);
        resolve();
      });

      hostSocket.emit("play", { currentTime: 30 });
    });

    console.log("\nTest 4: Host triggers 'pause'...");
    await new Promise((resolve) => {
      guestSocket.once("pause", (data) => {
        console.log(`✓ Guest received 'pause' event at ${data.currentTime}s triggered by ${data.by}`);
        resolve();
      });

      hostSocket.emit("pause", { currentTime: 45 });
    });

    console.log("\nTest 5: Host triggers 'seek'...");
    await new Promise((resolve) => {
      guestSocket.once("seek", (data) => {
        console.log(`✓ Guest received 'seek' event to ${data.currentTime}s triggered by ${data.by}`);
        resolve();
      });

      hostSocket.emit("seek", { currentTime: 120 });
    });

    console.log("\nTest 6: Host triggers 'change_video'...");
    await new Promise((resolve) => {
      guestSocket.once("change_video", (data) => {
        console.log(`✓ Guest received 'change_video' event with new video ID: ${data.videoId}`);
        resolve();
      });

      hostSocket.emit("change_video", { videoId: "kJQP7kiw5Fk" });
    });

    console.log("\nTest 7: Unauthorized Participant attempts to trigger 'play'...");
    await new Promise((resolve) => {
      guestSocket.once("error_message", (err) => {
        console.log(`✓ Backend correctly rejected unauthorized play: "${err.message}"`);
        resolve();
      });

      guestSocket.emit("play", { currentTime: 60 });
    });

    console.log("\nTest 8: Host assigns 'Moderator' role to Guest...");
    await new Promise((resolve) => {
      guestSocket.once("role_assigned", (data) => {
        console.log(`✓ Role assigned broadcast received. Guest new role: ${data.newRole}`);
        resolve();
      });

      hostSocket.emit("assign_role", {
        targetUserId: guestSocket.id,
        role: "Moderator"
      });
    });

    console.log("\nTest 9: Moderator triggers 'play'...");
    await new Promise((resolve) => {
      hostSocket.once("play", (data) => {
        console.log(`✓ Host received 'play' event triggered by Moderator (${data.by}) at ${data.currentTime}s`);
        resolve();
      });

      guestSocket.emit("play", { currentTime: 99 });
    });

    console.log("\nTest 10: Host removes participant...");
    await new Promise((resolve) => {
      guestSocket.once("participant_removed", (data) => {
        console.log(`✓ Removed user received notification: "${data.message}"`);
        resolve();
      });

      hostSocket.emit("remove_participant", {
        targetUserId: guestSocket.id
      });
    });

    console.log("\n========================================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! All 10 features verified.");
    console.log("========================================================\n");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    hostSocket.disconnect();
    guestSocket.disconnect();
  }
}

runTests();
