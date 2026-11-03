export async function mountSubscriptionsFixture(page) {
  await page.goto('/super-admin/preview/overview')
  await page.evaluate(async () => {
    const [{ default: React }, { default: ReactDOM }, { default: Harness }, { previewSubscribers }] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'), import('/tests/fixtures/SubscriptionsHarness.jsx'), import('/src/super-admin/previews/subscriptionPreviewData.js'),
    ])
    document.getElementById('root').hidden = true
    const node = document.createElement('div'); node.dataset.testid = 'isolated-subscriptions'; document.body.append(node)
    const root = ReactDOM.createRoot(node)
    window.renderSubscriptionsFixture = (status, records, subscriberCounts = {}) => root.render(React.createElement(Harness, { state: { status, records, subscriberCounts } }))
    window.renderSubscriptionsFixture('ready', previewSubscribers)
  })
  return page.getByTestId('isolated-subscriptions')
}
