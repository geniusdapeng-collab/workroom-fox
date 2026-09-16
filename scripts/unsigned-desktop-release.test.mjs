import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workflow = readFileSync(resolve(root, ".github/workflows/build-desktop.yml"), "utf8");
const builder = readFileSync(resolve(root, "electron-builder.yml"), "utf8");
const siteZh = readFileSync(resolve(root, "apps/site/index.html"), "utf8");
const siteEn = readFileSync(resolve(root, "apps/site/en.html"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const product = JSON.parse(readFileSync(resolve(root, "product.manifest.json"), "utf8"));

test("tag 发布显式选择 unsigned，手动发布保留 signed/unsigned 两条路径", () => {
  assert.match(workflow, /platform_signing:[\s\S]*options: \[signed, unsigned\][\s\S]*default: unsigned/u);
  assert.match(workflow, /PLATFORM_SIGNING: \$\{\{ github\.event_name == 'push' && 'unsigned' \|\| inputs\.platform_signing \}\}/u);
  assert.match(workflow, /if: env\.PLATFORM_SIGNING == 'signed'/u);
  assert.match(workflow, /if: env\.PLATFORM_SIGNING == 'unsigned'/u);
});

test("平台 unsigned 不放松内部 Bundle 签名、信任环与投影", () => {
  assert.ok((workflow.match(/BUNDLE_SIGNING_PRIVATE_KEY/g) ?? []).length >= 4);
  assert.ok((workflow.match(/pnpm bundle:release/g) ?? []).length >= 2);
  assert.ok((workflow.match(/pnpm projections:generate/g) ?? []).length >= 2);
  assert.ok((workflow.match(/pnpm projections:check/g) ?? []).length >= 2);
  assert.ok((workflow.match(/test -s build\/bundle-trust\.json/g) ?? []).length >= 2);
  assert.ok((workflow.match(/test -s "\$RES\/bundle-trust\.json"/g) ?? []).length >= 3);
  assert.match(builder, /from: build\/bundle-trust\.json[\s\S]*to: bundle-trust\.json/u);
  assert.equal(packageJson.scripts["bundle:release"], "tsx scripts/bundle-governance.mts --refresh-digests --release");
  assert.equal(packageJson.scripts["projections:generate"], "tsx scripts/generate-client-projections.mts --write");
  assert.equal(packageJson.scripts["projections:check"], "tsx scripts/generate-client-projections.mts");
});

test("三平台 unsigned 打包关闭自动证书发现并只在 signed 模式验签", () => {
  assert.ok((workflow.match(/CSC_IDENTITY_AUTO_DISCOVERY: "false"/g) ?? []).length >= 3);
  assert.ok((workflow.match(/-c\.mac\.notarize=false/g) ?? []).length >= 2);
  assert.match(workflow, /if \[ "\$PLATFORM_SIGNING" = "signed" \]; then[\s\S]*codesign --verify --deep --strict[\s\S]*xcrun stapler validate/u);
  assert.match(workflow, /if \[ "\$PLATFORM_SIGNING" = "signed" \]; then[\s\S]*Get-AuthenticodeSignature/u);
});

test("产品身份、端口与固定下载资产名保持一致", () => {
  assert.equal(product.displayName, "懂汇报的狐狸先生");
  assert.equal(product.desktop.portOffset, 520);
  assert.equal(product.release.appId, "com.geniusdapeng.workroomfox");
  assert.equal(product.release.artifactPrefix, "Workroom Fox");
  assert.equal(product.release.workflow, ".github/workflows/build-desktop.yml");
  assert.match(builder, /productName: 懂汇报的狐狸先生/u);
  assert.match(builder, /workloomPortOffset: 520/u);
  assert.match(builder, /artifactName: "Workroom Fox-\$\{os\}-\$\{arch\}\.\$\{ext\}"/u);
});

test("Release 明确披露未签名安装步骤", () => {
  assert.match(workflow, /平台签名状态/u);
  assert.match(workflow, /未签名、未 Apple 公证/u);
  assert.match(workflow, /xattr -cr/u);
  assert.match(workflow, /SmartScreen/u);
  assert.equal((workflow.match(/tag_name: \$\{\{ env\.VERSION \}\}/g) ?? []).length, 2);
});

test("官网固定下载入口与真实 DMG 资产一致，不保留历史 ZIP 死链", () => {
  for (const site of [siteZh, siteEn]) {
    assert.doesNotMatch(site, /WorkLoom-macOS\.zip/u);
    assert.match(site, /releases\/latest\/download\/Workroom%20Fox-mac-arm64\.dmg/u);
    assert.match(site, /Workroom Fox-mac-x64\.dmg/u);
  }
});

test("Windows 实包冒烟与 runner 的 PostgreSQL 工具链隔离", () => {
  for (const [name, port] of [
    ["WORKLOOM_PG_PORT", "55432"],
    ["WORKLOOM_SERVER_PORT", "58787"],
    ["WORKLOOM_WEB_PORT", "55173"],
    ["WORKLOOM_NATS_PORT", "54222"],
  ]) {
    assert.ok(workflow.includes(`${name}: "${port}"`), `缺少 ${name} 隔离端口`);
  }
  for (const supportRoot of ["wl-smoke", "wl-app-smoke", "wl-render-default"]) {
    assert.ok(workflow.includes(`$RUNNER_TEMP/${supportRoot}`), `${supportRoot} 未统一使用 RUNNER_TEMP`);
    assert.ok(workflow.includes(`\${{ runner.temp }}/${supportRoot}/logs/`), `${supportRoot} 日志未进入失败诊断`);
    assert.ok(workflow.includes(`\${{ runner.temp }}/${supportRoot}/install-state.json`), `${supportRoot} 状态未进入失败诊断`);
  }
  assert.match(workflow, /actions\/upload-artifact@v4/u);
  assert.match(workflow, /锁定源安装 17\.11\.0/u);
  assert.doesNotMatch(workflow, /\$\{TEMP\}\/wl-/u);
  assert.doesNotMatch(workflow, /\$env:TEMP\\wl-/u);
});
