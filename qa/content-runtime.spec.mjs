import { test, expect } from "playwright/test";
for (const [surface, route] of [["react", "/onboarding"], ["desk", "/app"]]) {
  for (const [size, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    test(`${surface}-${size}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const identity = await page.request.get("/api/method/frappe.auth.get_logged_user");
      expect(identity.ok()).toBeTruthy();
      const { message: user } = await identity.json();
      expect(user).toBe("content-browser-owner@example.test");
      expect(user).not.toBe("Administrator");
      const response = await page.goto(route, { waitUntil: "networkidle" });
      if (surface === "react") {
        const connected = await page.evaluate(() => new Promise((resolve) => {
          const socket = new WebSocket(`${location.origin.replace("http", "ws")}/socket.io/?EIO=4&transport=websocket`);
          const namespace = "/meet-beta-feat-content-publishing-galler-5839d4.localhost";
          const finish = (connected, reason = "") => { clearTimeout(timer); socket.close(); resolve({ connected, reason }); };
          const timer = setTimeout(() => finish(false, "websocket_timeout"), 10000);
          socket.onerror = () => finish(false, "websocket_transport_error");
          socket.onmessage = ({ data }) => {
            if (data.startsWith("0")) socket.send(`40${namespace},`);
            else if (data.startsWith(`40${namespace},`)) finish(true);
            else if (data.startsWith(`44${namespace},`)) finish(false, JSON.parse(data.slice(data.indexOf(",") + 1)).message);
            else if (data === "2") socket.send("3");
          };
        }));
        expect(connected.connected, connected.reason).toBeTruthy();
      }
      expect(response.status()).toBeLessThan(400);
      await expect(page.locator("body")).not.toHaveText("");
      expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(40);
      await page.screenshot({ path: testInfo.outputPath(`${surface}-${size}.png`), fullPage: true });
    });
  }
}
