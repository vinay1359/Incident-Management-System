"""
Seed script: Simulates various infrastructure failures.

1. Sends 150 signals for RDBMS_PRIMARY (P0) over 8 seconds  → 1 Work Item
2. Waits 3 seconds
3. Sends 80 signals for MCP_HOST_01 (P1) over 5 seconds     → 1 Work Item
4. Sends 300 signals for REDIS_CACHE (P2) over 6 seconds    → 1 Work Item
5. Sends 120 signals for RABBITMQ_MAIN (P1) over 4 seconds  → 1 Work Item
6. Prints a summary
"""

import asyncio
import time

import httpx

API_URL = "http://localhost:8000"


async def send_signals(
    client: httpx.AsyncClient,
    component_id: str,
    component_type: str,
    severity: str,
    count: int,
    duration_seconds: float,
):
    """Send `count` signals evenly spaced over `duration_seconds`."""
    delay = duration_seconds / count
    tasks = []

    for i in range(count):
        payload = {
            "component_id": component_id,
            "component_type": component_type,
            "severity": severity,
            "message": f"[{severity}] Signal #{i+1} from {component_id}",
            "metadata": {"sequence": i + 1, "simulated": True},
        }
        tasks.append(client.post(f"{API_URL}/api/signals", json=payload))
        await asyncio.sleep(delay)

    results = await asyncio.gather(*tasks, return_exceptions=True)
    accepted = sum(1 for r in results if not isinstance(r, Exception) and r.status_code == 202)
    failed = len(results) - accepted
    return accepted, failed


async def main():
    print("=" * 60)
    print("  IMS Failure Simulation Script")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=30) as client:
        # ── Phase 1: RDBMS outage ───────────────────────
        print("\n[Phase 1] Simulating RDBMS outage...")
        print(f"   Sending 150 P0 signals for RDBMS_PRIMARY over 8 seconds")
        t0 = time.monotonic()
        acc1, fail1 = await send_signals(
            client, "RDBMS_PRIMARY", "RDBMS", "P0", 150, 8.0
        )
        t1 = time.monotonic()
        print(f"   Success: {acc1} | Failed: {fail1} | Time: {t1-t0:.1f}s")

        # ── Pause ───────────────────────────────────────
        print("\n   Waiting 3 seconds...")
        await asyncio.sleep(3)

        # ── Phase 2: MCP host failure ───────────────────
        print("\n[Phase 2] Simulating MCP host failure...")
        print(f"   Sending 80 P1 signals for MCP_HOST_01 over 5 seconds")
        t2 = time.monotonic()
        acc2, fail2 = await send_signals(
            client, "MCP_HOST_01", "MCP_HOST", "P1", 80, 5.0
        )
        t3 = time.monotonic()
        print(f"   Success: {acc2} | Failed: {fail2} | Time: {t3-t2:.1f}s")

        # ── Pause ───────────────────────────────────────
        print("\n   Waiting 2 seconds...")
        await asyncio.sleep(2)

        # ── Phase 3: Cache spike ────────────────────────
        print("\n[Phase 3] Simulating Cache Latency Spike...")
        print(f"   Sending 300 P2 signals for REDIS_CACHE over 6 seconds")
        t4 = time.monotonic()
        acc3, fail3 = await send_signals(
            client, "REDIS_CACHE", "CACHE", "P2", 300, 6.0
        )
        t5 = time.monotonic()
        print(f"   Success: {acc3} | Failed: {fail3} | Time: {t5-t4:.1f}s")

        # ── Pause ───────────────────────────────────────
        print("\n   Waiting 2 seconds...")
        await asyncio.sleep(2)

        # ── Phase 4: Queue Backup ───────────────────────
        print("\n[Phase 4] Simulating Distributed Queue Backup...")
        print(f"   Sending 120 P1 signals for RABBITMQ_MAIN over 4 seconds")
        t6 = time.monotonic()
        acc4, fail4 = await send_signals(
            client, "RABBITMQ_MAIN", "QUEUE", "P1", 120, 4.0
        )
        t7 = time.monotonic()
        print(f"   Success: {acc4} | Failed: {fail4} | Time: {t7-t6:.1f}s")

        # ── Summary ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("  SIMULATION SUMMARY")
        print("=" * 60)
        print(f"  RDBMS_PRIMARY : {acc1} signals accepted → should create 1 Work Item")
        print(f"  MCP_HOST_01   : {acc2} signals accepted → should create 1 Work Item")
        print(f"  REDIS_CACHE   : {acc3} signals accepted → should create 1 Work Item")
        print(f"  RABBITMQ_MAIN : {acc4} signals accepted → should create 1 Work Item")
        print(f"  Total duration: {t7-t0:.1f}s")
        print()

        # ── Verify ──────────────────────────────────────
        await asyncio.sleep(2)
        try:
            res = await client.get(f"{API_URL}/api/incidents")
            incidents = res.json()
            print(f"  [Info] Incidents in system: {len(incidents)}")
            for inc in incidents:
                print(
                    f"     - {inc['component_id']:<15} | {inc['severity']} | "
                    f"status={inc['status']:<13} | signals={inc['signal_count']}"
                )
        except Exception as e:
            print(f"  [Error] Could not verify incidents: {e}")

        print()


if __name__ == "__main__":
    asyncio.run(main())
