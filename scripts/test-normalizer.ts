/**
 * Beekeeping Normalizer Regression Test Runner
 * Run using: npx tsx scripts/test-normalizer.ts
 */

import { normalizeBeekeepingText } from '../src/services/beekeepingNormalizer';

interface TestCase {
  name: string;
  input: string;
  expected: string;
  expectedRules?: string[];
}

const TEST_CASES: TestCase[] = [
  // 1. Core Frame-Bee (N장벌) Normalization Test Cases
  {
    name: '1. 4장벌 기본 유지',
    input: '36번 벌통 4장벌로 축소',
    expected: '36번 벌통 4장벌로 축소'
  },
  {
    name: '2. 4매벌 -> 4장벌 변환',
    input: '36번 벌통 4매벌로 축소',
    expected: '36번 벌통 4장벌로 축소',
    expectedRules: ['매벌→장벌']
  },
  {
    name: '3. 네 장 벌 (공백 포함) -> 4장벌 변환',
    input: '36번 벌통 네 장 벌로 축소',
    expected: '36번 벌통 4장벌로 축소',
    expectedRules: ['한글수사벌→N장벌']
  },
  {
    name: '3-B. 네장벌 (붙임) -> 4장벌 변환',
    input: '36번 벌통 네장벌로 축소',
    expected: '36번 벌통 4장벌로 축소',
    expectedRules: ['한글수사벌→N장벌']
  },
  {
    name: '4. 내장벌 STT 오인식 -> 4장벌 변환 (핵심 오류 해결)',
    input: '36번 벌통 내장벌로 축소',
    expected: '36번 벌통 4장벌로 축소',
    expectedRules: ['내장벌→4장벌']
  },
  {
    name: '4-B. 내장벌 축소 (조사 없는 경우)',
    input: '36번 벌통 내장벌 축소',
    expected: '36번 벌통 4장벌 축소',
    expectedRules: ['내장벌→4장벌']
  },
  {
    name: '4-C. 내 장 벌로 축소 (오인식 분리 공백)',
    input: '36번 벌통 내 장 벌로 축소',
    expected: '36번 벌통 4장벌로 축소',
    expectedRules: ['내장벌→4장벌']
  },
  {
    name: '4-D. 타 숫자/장수 표현 확장 (세장벌 -> 3장벌, 5매벌 -> 5장벌)',
    input: '12번 벌통 세장벌 유지, 15번 벌통 5매벌 세력',
    expected: '12번 벌통 3장벌 유지, 15번 벌통 5장벌 세력'
  },

  // 2. Existing Normalization Rules Retention
  {
    name: '5-A. 물통 -> 벌통 (숫자+물통)',
    input: '41번 물통 내검 완료',
    expected: '41번 벌통 내검 완료',
    expectedRules: ['숫자+물통→벌통']
  },
  {
    name: '5-B. 물통 -> 벌통 (한글 숫자+물통)',
    input: '삼번 물통 점검',
    expected: '삼번 벌통 점검',
    expectedRules: ['한글숫자+물통→벌통']
  },
  {
    name: '5-C. 내금/내껌 -> 내검',
    input: '1번 벌통 내금 완료',
    expected: '1번 벌통 내검 완료',
    expectedRules: ['내금/내껌→내검']
  },
  {
    name: '5-D. 양봉문맥 예금 -> 내검',
    input: '1번 벌통 예금 실시',
    expected: '1번 벌통 내검 실시',
    expectedRules: ['양봉문맥예금→내검']
  },
  {
    name: '5-E. 잘난 -> 산란',
    input: '여왕벌 잘난 확인',
    expected: '여왕벌 산란 확인',
    expectedRules: ['잘난→산란']
  },
  {
    name: '5-F. 꿀 수확 표현 -> 채밀',
    input: '오늘 2번 벌통 꿀 땄음',
    expected: '오늘 2번 벌통 채밀',
    expectedRules: ['꿀수확표현→채밀']
  },

  // 3. Safety Guard / False Positive Prevention Tests
  {
    name: '6-A. 일반 문맥 내장벌레 미변환 보존',
    input: '내장벌레를 조심해야 한다',
    expected: '내장벌레를 조심해야 한다'
  },
  {
    name: '6-B. 일반 의학 문맥 내장벌림 미변환 보존',
    input: '의학에서 체내 내장벌림 수술',
    expected: '의학에서 체내 내장벌림 수술'
  },
  {
    name: '6-C. 실제 급수 물통 미변환 보존',
    input: '급수기에 물통을 가득 채웠다',
    expected: '급수기에 물통을 가득 채웠다'
  },
  {
    name: '6-D. 금융 문맥 예금 미변환 보존',
    input: '은행에 예금을 입금했다',
    expected: '은행에 예금을 입금했다'
  }
];

function runTests() {
  console.log('====================================================');
  console.log('🐝 허니비테코 양봉 음성인식 정규화 회귀 테스트 실행');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of TEST_CASES) {
    const result = normalizeBeekeepingText(tc.input);
    const isTextMatch = result.normalizedText === tc.expected;
    const isRulesMatch =
      !tc.expectedRules ||
      tc.expectedRules.every((rule) => result.appliedRules.includes(rule));

    if (isTextMatch && isRulesMatch) {
      console.log(`✅ [PASS] ${tc.name}`);
      console.log(`   입력: "${tc.input}"`);
      console.log(`   결과: "${result.normalizedText}"`);
      if (result.appliedRules.length > 0) {
        console.log(`   규칙: [${result.appliedRules.join(', ')}]`);
      }
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${tc.name}`);
      console.error(`   입력:     "${tc.input}"`);
      console.error(`   예상 결과: "${tc.expected}"`);
      console.error(`   실제 결과: "${result.normalizedText}"`);
      if (tc.expectedRules) {
        console.error(`   예상 규칙: [${tc.expectedRules.join(', ')}]`);
        console.error(`   실제 규칙: [${result.appliedRules.join(', ')}]`);
      }
      failedCount++;
    }
    console.log('');
  }

  // 4. Test VoiceRecordSheet's "전체 벌통" Batch Recognition Preservation
  console.log('----------------------------------------------------');
  console.log('📦 전체 벌통 일괄 기록 정규화 보존 검증');
  const allHivesInputs = [
    '전체 벌통 4장벌로 축소',
    '전체 물통 내검 완료',
    '모든 벌통 사양 완료'
  ];

  const allHivesRegex = /(?:전체|모든)\s*(?:벌통|물통)|(?:^|[^가-힣0-9])전\s*(?:벌통|물통)/;

  let allHivesPassed = true;
  for (const input of allHivesInputs) {
    const norm = normalizeBeekeepingText(input);
    const matchesBatch = allHivesRegex.test(norm.normalizedText);
    if (matchesBatch) {
      console.log(`✅ [PASS] 전체벌통 인식 보존: "${input}" -> "${norm.normalizedText}" (일괄기록 매칭 성공)`);
    } else {
      console.error(`❌ [FAIL] 전체벌통 인식 누락: "${input}" -> "${norm.normalizedText}"`);
      allHivesPassed = false;
    }
  }

  console.log('\n====================================================');
  console.log(`📊 테스트 결과: 총 ${TEST_CASES.length + allHivesInputs.length}건 중 ${passedCount + (allHivesPassed ? allHivesInputs.length : 0)}건 성공, ${failedCount}건 실패`);
  console.log('====================================================');

  if (failedCount > 0 || !allHivesPassed) {
    process.exit(1);
  }
}

runTests();
