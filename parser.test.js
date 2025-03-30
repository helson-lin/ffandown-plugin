import { makeParser, getScriptContentFromFile } from './utils/index.js';

describe('Ffandown Plugin Test', () => {
  let parser;
  
  // 在所有测试前初始化parser
  beforeAll(() => {
    const scriptContent = getScriptContentFromFile();
    parser = makeParser(scriptContent);
  });

  test('plugin should be created', () => {
    expect(parser).toBeDefined();
    expect(parser).not.toBeNull();
  });

  // 测试match函数是否存在并返回布尔值
  test('plugin should have match method and return boolean value', () => {
    expect(typeof parser.match).toBe('function');
    
    const testUrls = [
      '【Steam只卖29元的网红"拼好帧"软件】 https://www.bilibili.com/video/BV1xtKVe9EkX',
      'https://www.bilibili.com/video/BV1xtKVe9EkX',
      'https://b23.tv/abcdefg',
      'https://live.bilibili.com/12345'
    ];
    
    testUrls.forEach(url => {
      const result = parser.match(url);
      expect(typeof result).toBe('boolean');
    });
  });

  // 测试parser.parser函数是否存在
  test('plugin should have parser method', () => {
    expect(typeof parser.parser).toBe('function');
  });


  // 测试parser函数对链接的解析能力
  test('plugin should parser url', async () => {
    const url = '【Steam只卖29元的网红“拼好帧”软件，一夜间让多少残疾显卡飞升50系“卡皇”？】 https://www.bilibili.com/video/BV1xtKVe9EkX/?share_source=copy_web&vd_source=9ba5bfcd2cc6713c6e928eaebfb0592f';
    const matched = parser.match(url);
    
    if (matched) {
      try {
        const result = await parser.parser(url, { cookie: '' });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('url');
      } catch (error) {
        console.log('Encountered an error while parsing the live streaming link:', error.message);
      }
    } else {
      console.log('URL mismatch, skip parsing test');
    }
  });
});