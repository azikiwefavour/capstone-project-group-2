export async function mountFacilitiesFixture(page, { status = 'ready', size = 7 } = {}) {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async ({ status, size }) => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }, { facilityPreviewRows }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/FacilitiesHarness.jsx'), import('/src/super-admin/previews/facilityPreviewData.js'),
    ])
    // Keep the application route untouched; the isolated test host has its own router.
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'isolated-facilities'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderFacilitiesFixture = (status, records) => root.render(React.createElement(Harness, { state: { status, records } }))
    window.renderFacilitiesFixture(status, size === 7 ? facilityPreviewRows.slice(7, 14) : facilityPreviewRows.slice(0, size))
  }, { status, size })
  return page.getByTestId('isolated-facilities')
}
