
const BASE_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'zbynekbal97@gmail.com';
const TEST_EMAIL_1 = 'bluegodablecz@gmail.com';
const TEST_EMAIL_2 = 'pharao1997@gmail.com';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function runTest(p1Email, p2Email, scenarioName) {
    console.log(`\n--- STARTING SCENARIO: ${scenarioName} ---`);
    console.log(`P1: ${p1Email}, P2: ${p2Email}`);

    const roomId = 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const p1Nick = p1Email === 'guest' ? 'Guest1' : p1Email.split('@')[0];
    const p2Nick = p2Email === 'guest' ? 'Guest2' : p2Email.split('@')[0];

    try {
        // 1. Create Room
        console.log(`[1] Creating room ${roomId} by ${p1Nick}...`);
        await fetch(`${BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, hostName: p1Nick, hostEmail: p1Email })
        });

        // 2. Join Room
        console.log(`[2] ${p2Nick} joining room ${roomId}...`);
        await fetch(`${BASE_URL}/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: p2Nick, email: p2Email })
        });

        // 3. Ready Check
        console.log(`[3] Toggling ready for both...`);
        await fetch(`${BASE_URL}/rooms/${roomId}/ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: p1Nick, isReady: true })
        });
        await fetch(`${BASE_URL}/rooms/${roomId}/ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: p2Nick, isReady: true })
        });

        // 4. Start Game
        console.log(`[4] Starting game...`);
        await fetch(`${BASE_URL}/rooms/${roomId}/start-game`, { method: 'POST' });

        // Verify status
        const statusRes = await fetch(`${BASE_URL}/rooms/${roomId}/status`);
        const status = await statusRes.json();
        console.log(`   Status Debug:`, JSON.stringify(status).substring(0, 100));
        if (!status.members) {
            console.error("   Error: members undefined. Room object:", status);
            throw new Error("Room status invalid");
        }
        console.log(`   Status: Started=${status.isGameStarted}, Round=${status.roundNumber}, Members=${status.members.length}`);

        // 5. Test Swap (Trading)
        // We need real item IDs from Admin's inventory for the backend to find them
        const adminInvRes = await fetch(`${BASE_URL}/inventory/${ADMIN_EMAIL}`);
        const adminInv = await adminInvRes.json();
        if (adminInv.length < 2) throw new Error("Need at least 2 items in admin inventory to test swap");

        const item1Id = adminInv[0].id;
        const item2Id = adminInv[1].id;

        console.log(`[5] Testing swap: ${p1Nick}(${item1Id}) <-> ${p2Nick}(${item2Id})...`);
        const swapRes = await fetch(`${BASE_URL}/inventory/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player1Email: p1Email,
                player2Email: p2Email,
                item1Id: item1Id,
                item2Id: item2Id
            })
        });
        const swapResult = await swapRes.json();
        console.log(`   Swap Response: Success=${swapResult.success}, ReturnedItem1=${swapResult.item1?.title}, ReturnedItem2=${swapResult.item2?.title}`);

        // 6. Test Next Turn
        console.log(`[6] Testing turn and cycles...`);
        const turnRes = await fetch(`${BASE_URL}/rooms/${roomId}/next-turn`, { method: 'POST' });
        const turnStatus = await (await fetch(`${BASE_URL}/rooms/${roomId}/status`)).json();
        console.log(`   Next Turn: Index=${turnStatus.turnIndex}, Round=${turnStatus.roundNumber}`);

        // 7. Test Message
        console.log(`[7] Testing chat...`);
        await fetch(`${BASE_URL}/rooms/${roomId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: p1Nick, text: 'Hello MP!' })
        });
        const msgs = await (await fetch(`${BASE_URL}/rooms/${roomId}/messages`)).json();
        console.log(`   Messages Count: ${msgs.length}, Last: "${msgs[msgs.length - 1].text}"`);

        // 8. Cleanup (Leave)
        console.log(`[8] Cleaning up...`);
        await fetch(`${BASE_URL}/rooms/${roomId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: p1Nick })
        });
        await fetch(`${BASE_URL}/rooms/${roomId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: p2Nick })
        });

        console.log(`--- SCENARIO ${scenarioName} COMPLETED SUCCESSFULLY ---`);
    } catch (e) {
        console.error(`!!! SCENARIO ${scenarioName} FAILED:`, e.message);
    }
}

async function main() {
    console.log("=== NEXUS MULTIPLAYER VERIFICATION SUITE ===");

    // Combinations requested: Cloud+Cloud, Cloud+Host, Host+Cloud, Host+Host
    await runTest(TEST_EMAIL_1, TEST_EMAIL_2, "Cloud + Cloud");
    await runTest(TEST_EMAIL_1, 'guest', "Cloud + Host");
    await runTest('guest', TEST_EMAIL_1, "Host + Cloud");
    await runTest('guest', 'guest', "Host + Host");

    console.log("\n=== ALL VERIFICATIONS FINISHED ===");
}

main();
