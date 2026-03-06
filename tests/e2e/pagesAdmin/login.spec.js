/**
 * 管理端登录页面 E2E 测试
 */
describe('管理端登录', () => {
  let page

  beforeEach(async () => {
    page = await program.navigateTo('/pagesAdmin/login/index')
    await page.waitFor('view')
  })

  afterEach(async () => {
    if (page) {
      await page.close()
    }
  })

  test('页面正常加载', async () => {
    // 检查标题
    const title = await page.$('.app-name')
    expect(title).toBeTruthy()
    
    const titleText = await title.text()
    expect(titleText).toContain('大友元气')
  })

  test('显示登录表单', async () => {
    // 检查用户名输入框
    const usernameInput = await page.$('input[placeholder="请输入用户名"]')
    expect(usernameInput).toBeTruthy()

    // 检查密码输入框
    const passwordInput = await page.$('input[placeholder="请输入密码"]')
    expect(passwordInput).toBeTruthy()

    // 检查登录按钮
    const loginBtn = await page.$('.login-btn')
    expect(loginBtn).toBeTruthy()
  })

  test('表单验证 - 空用户名', async () => {
    // 不输入用户名，直接点击登录
    const loginBtn = await page.$('.login-btn')
    await loginBtn.tap()

    // 等待 toast 提示
    await page.waitFor(500)
    
    // 应该显示错误提示（通过 toast）
    // 这里检查输入框是否仍然存在（未跳转）
    const usernameInput = await page.$('input[placeholder="请输入用户名"]')
    expect(usernameInput).toBeTruthy()
  })

  test('表单验证 - 空密码', async () => {
    // 输入用户名但不输入密码
    const usernameInput = await page.$('input[placeholder="请输入用户名"]')
    await usernameInput.input('testuser')

    const loginBtn = await page.$('.login-btn')
    await loginBtn.tap()

    await page.waitFor(500)
    
    // 应该显示错误提示
    const passwordInput = await page.$('input[placeholder="请输入密码"]')
    expect(passwordInput).toBeTruthy()
  })

  test('密码显示/隐藏切换', async () => {
    const passwordInput = await page.$('input[placeholder="请输入密码"]')
    const toggleBtn = await page.$('.toggle-password')
    
    // 初始应该是密码类型
    const initialType = await passwordInput.attribute('type')
    expect(initialType).toBe('password')

    // 点击切换按钮
    await toggleBtn.tap()
    await page.waitFor(100)

    // 应该变成文本类型
    const newType = await passwordInput.attribute('type')
    expect(newType).toBe('text')
  })

  test('返回用户端按钮', async () => {
    const backLink = await page.$('.back-link')
    expect(backLink).toBeTruthy()
    
    const backText = await backLink.text()
    expect(backText).toContain('返回用户端')
  })

  // 需要真实账号才能测试
  // test('登录成功', async () => {
  //   const usernameInput = await page.$('input[placeholder="请输入用户名"]')
  //   const passwordInput = await page.$('input[placeholder="请输入密码"]')
  //   const loginBtn = await page.$('.login-btn')
  //
  //   await usernameInput.input('admin')
  //   await passwordInput.input('password123')
  //   await loginBtn.tap()
  //
  //   // 等待跳转到 dashboard
  //   await page.waitFor(2000)
  //   
  //   // 检查是否跳转成功
  //   const currentPage = await program.currentPage()
  //   expect(currentPage.path).toContain('dashboard')
  // })
})
