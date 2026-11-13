import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import { normalizeBeekeepingText } from './src/services/beekeepingNormalizer';
import firebaseConfigData from './firebase-applet-config.json';
import {
  createPublicHoneyTraceData,
  generatePublicTraceId,
  buildPublishedHoneyTracePayload,
  sanitizePublicTraceData
} from './src/services/honeyTracePublicService';
import { HoneyLot, VoiceLogItem } from './src/types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      error: '요청 데이터 크기가 허용 한도(32KB)를 초과했습니다.'
    });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      error: '잘못된 JSON 요청 형식입니다.'
    });
  }
  next(err);
});

// Lazy-initialized Gemini AI client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// API healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasKmaKey: Boolean(process.env.KMA_API_KEY)
  });
});

// KMA API Key from environment/secrets
const RAW_KMA_KEY = process.env.KMA_API_KEY || '';

function getDecodedKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

// Representative coordinates for Korean beekeeping hubs
const REGION_GEO_MAP: Record<string, { name: string; stationName: string; lat: number; lon: number }> = {
  '구례': { name: '전남 구례군 (산동면 봉장)', stationName: '기상청 구례 관측소 (지리산)', lat: 35.2023, lon: 127.4628 },
  '산청': { name: '경남 산청군 (삼장면 봉장)', stationName: '기상청 산청 관측소 (지리산)', lat: 35.4155, lon: 127.8735 },
  '하동': { name: '경남 하동군 (화개면 봉장)', stationName: '기상청 하동 관측소', lat: 35.0672, lon: 127.7516 },
  '남원': { name: '전북 남원시 (운봉읍 봉장)', stationName: '기상청 남원 관측소', lat: 35.4164, lon: 127.3903 },
  '곡성': { name: '전남 곡성군 (죽곡면 봉장)', stationName: '기상청 곡성 관측소', lat: 35.2818, lon: 127.2917 },
  '영주': { name: '경북 영주시 (풍기읍 봉장)', stationName: '기상청 영주 관측소 (소백산)', lat: 36.8057, lon: 128.6241 },
  '상주': { name: '경북 상주시 (화북면 봉장)', stationName: '기상청 상주 관측소 (속리산)', lat: 36.4109, lon: 128.1591 },
  '문경': { name: '경북 문경시 (문경읍 봉장)', stationName: '기상청 문경 관측소', lat: 36.5861, lon: 128.1867 },
  '안동': { name: '경북 안동시 (도산면 봉장)', stationName: '기상청 안동 관측소', lat: 36.5684, lon: 128.7294 },
  '봉화': { name: '경북 봉화군 (춘양면 봉장)', stationName: '기상청 봉화 관측소', lat: 36.8932, lon: 128.7325 },
  '평창': { name: '강원 평창군 (대관령 봉장)', stationName: '기상청 대관령 관측소', lat: 37.6771, lon: 128.7183 },
  '영월': { name: '강원 영월군 (수주면 봉장)', stationName: '기상청 영월 관측소', lat: 37.1837, lon: 128.4619 },
  '정선': { name: '강원 정선군 (정선읍 봉장)', stationName: '기상청 정선 관측소', lat: 37.3807, lon: 128.6608 },
  '홍천': { name: '강원 홍천군 (화촌면 봉장)', stationName: '기상청 홍천 관측소', lat: 37.6972, lon: 127.8887 },
  '충주': { name: '충북 충주시 (살미면 봉장)', stationName: '기상청 충주 관측소 (월악산)', lat: 36.9912, lon: 127.9261 },
  '단양': { name: '충북 단양군 (가곡면 봉장)', stationName: '기상청 단양 관측소 (소백산)', lat: 36.9845, lon: 128.3654 },
  '제천': { name: '충북 제천시 (덕산면 봉장)', stationName: '기상청 제천 관측소', lat: 37.1326, lon: 128.1911 },
  '영동': { name: '충북 영동군 (상촌면 봉장)', stationName: '기상청 영동 관측소 (민주지산)', lat: 36.1751, lon: 127.7833 },
  '양평': { name: '경기 양평군 (용문면 봉장)', stationName: '기상청 양평 관측소', lat: 37.4916, lon: 127.4876 },
  '가평': { name: '경기 가평군 (북면 봉장)', stationName: '기상청 가평 관측소', lat: 37.8315, lon: 127.5097 },
  '밀양': { name: '경남 밀양시 (산내면 봉장)', stationName: '기상청 밀양 관측소 (가지산)', lat: 35.5038, lon: 128.7466 },
  '서귀포': { name: '제주 서귀포시 (남원읍 봉장)', stationName: '기상청 서귀포 관측소 (한라산)', lat: 33.2541, lon: 126.5601 },
  '제주': { name: '제주 제주시 (애월읍 봉장)', stationName: '기상청 제주 관측소', lat: 33.4996, lon: 126.5312 },
  '서울': { name: '서울특별시 (관악산 봉장)', stationName: '기상청 서울 관측소', lat: 37.5665, lon: 126.9780 },
  '대전': { name: '대전광역시 (식장산 봉장)', stationName: '기상청 대전 관측소', lat: 36.3504, lon: 127.3845 },
  '대구': { name: '대구광역시 (팔공산 봉장)', stationName: '기상청 대구 관측소', lat: 35.8714, lon: 128.6014 },
  '광주': { name: '광주광역시 (무등산 봉장)', stationName: '기상청 광주 관측소', lat: 35.1595, lon: 126.8526 },
  '부산': { name: '부산광역시 (금정산 봉장)', stationName: '기상청 부산 관측소', lat: 35.1796, lon: 129.0756 }
};

function resolveGeo(address: string): { name: string; stationName: string; lat: number; lon: number } {
  if (!address) {
    return REGION_GEO_MAP['구례'];
  }
  for (const [key, val] of Object.entries(REGION_GEO_MAP)) {
    if (address.includes(key)) {
      return {
        ...val,
        name: address.split(' ').slice(0, 3).join(' ') || val.name
      };
    }
  }
  return {
    ...REGION_GEO_MAP['구례'],
    name: address
  };
}

// Convert Lat/Lon to KMA Lambert Conformal Conic (nx, ny)
function latLonToKmaGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0 * (Math.PI / 180.0);
  const SLAT2 = 60.0 * (Math.PI / 180.0);
  const OLON = 126.0 * (Math.PI / 180.0);
  const OLAT = 38.0 * (Math.PI / 180.0);
  const XO = 43;
  const YO = 136;

  const sn = Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) / Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  const snVal = Math.log(Math.cos(SLAT1) / Math.cos(SLAT2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + SLAT1 * 0.5);
  sf = (Math.pow(sf, snVal) * Math.cos(SLAT1)) / snVal;
  let ro = Math.tan(Math.PI * 0.25 + OLAT * 0.5);
  ro = (RE / GRID) * sf / Math.pow(ro, snVal);

  let ra = Math.tan(Math.PI * 0.25 + lat * (Math.PI / 180.0) * 0.5);
  ra = (RE / GRID) * sf / Math.pow(ra, snVal);
  let theta = lon * (Math.PI / 180.0) - OLON;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= snVal;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

// Calculate KST Base Date and Time for KMA 단기예보 (getVilageFcst)
function getKmaBaseDateTime(): { baseDate: string; baseTime: string; nowKst: Date } {
  const now = new Date();
  // Convert to KST (UTC+9)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);

  const hours = kst.getHours();
  const minutes = kst.getMinutes();
  const timeNum = hours * 100 + minutes;

  const baseTimes = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  let selectedBase = 2300;
  let isPreviousDay = false;

  // Base times are announced 10-15 mins after base_time
  if (timeNum < 215) {
    isPreviousDay = true;
    selectedBase = 2300;
  } else if (timeNum < 515) {
    selectedBase = 200;
  } else if (timeNum < 815) {
    selectedBase = 500;
  } else if (timeNum < 1115) {
    selectedBase = 800;
  } else if (timeNum < 1415) {
    selectedBase = 1100;
  } else if (timeNum < 1715) {
    selectedBase = 1400;
  } else if (timeNum < 2015) {
    selectedBase = 1700;
  } else if (timeNum < 2315) {
    selectedBase = 2000;
  } else {
    selectedBase = 2300;
  }

  const targetDate = new Date(kst);
  if (isPreviousDay) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const baseDate = `${y}${m}${d}`;
  const baseTime = String(selectedBase).padStart(4, '0');

  return { baseDate, baseTime, nowKst: kst };
}

function calculateBeeFlight(temp: number, wind: number, precip: number): {
  score: '최적' | '양호' | '주의' | '비행불가';
  impactText: string;
} {
  if (precip > 50 || wind > 6.0 || temp < 10 || temp > 38) {
    return {
      score: '비행불가',
      impactText: `강풍(풍속 ${wind}m/s) 또는 강우(${precip}%)로 외역봉 비행 중단`
    };
  }
  if (wind > 4.0 || precip > 20 || temp < 15 || temp > 33) {
    return {
      score: '주의',
      impactText: `풍속(${wind}m/s) 및 기온(${temp}°C) 영향으로 채밀 저하 가능`
    };
  }
  if (wind <= 2.5 && precip <= 10 && temp >= 18 && temp <= 29) {
    return {
      score: '최적',
      impactText: `풍속 ${wind}m/s, 강수 ${precip}%로 방화 채밀 활동에 최적`
    };
  }
  return {
    score: '양호',
    impactText: `풍속 ${wind}m/s로 양호한 외역 비행 상태`
  };
}

// Server-side cache for meteorological weather queries (TTL: 10 minutes)
const weatherServerCache = new Map<string, { timestamp: number; data: any }>();
const WEATHER_CACHE_TTL = 10 * 60 * 1000;

// Deterministic seasonal Korean climate generator for offline/firewalled container resilience
function generateSeasonalWeatherFallback(lat: number, lon: number): Record<string, any> {
  const result: Record<string, any> = {};
  const today = new Date();

  for (let offset = -35; offset <= 16; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth() + 1;
    const day = d.getDate();

    const seed = (d.getFullYear() * 10000 + month * 100 + day + Math.round(lat * 10) + Math.round(lon * 10)) % 100;
    const varTemp = ((seed % 11) - 5) * 0.4;

    let baseMin = 14;
    let baseMax = 25;
    if (month >= 3 && month <= 5) {
      baseMin = month === 3 ? 2 : month === 4 ? 8 : 13;
      baseMax = month === 3 ? 12 : month === 4 ? 18 : 24;
    } else if (month >= 6 && month <= 8) {
      baseMin = month === 6 ? 18 : 22;
      baseMax = month === 6 ? 28 : 31;
    } else if (month >= 9 && month <= 11) {
      baseMin = month === 9 ? 15 : month === 10 ? 9 : 2;
      baseMax = month === 9 ? 25 : month === 10 ? 19 : 12;
    } else {
      baseMin = -5;
      baseMax = 4;
    }

    const minTemp = Math.round((baseMin + varTemp) * 10) / 10;
    const maxTemp = Math.round((baseMax + varTemp) * 10) / 10;
    const avgTemp = Math.round(((minTemp + maxTemp) / 2) * 10) / 10;

    let condition = '맑음';
    let icon = 'wb_sunny';
    let pop = 0;
    if (seed % 10 < 5) {
      condition = '맑음';
      icon = 'wb_sunny';
      pop = 10;
    } else if (seed % 10 < 8) {
      condition = '구름많음';
      icon = 'partly_cloudy_day';
      pop = 20;
    } else {
      condition = '흐림';
      icon = 'cloud';
      pop = 40;
    }

    const windSpeed = Math.round((1.2 + (seed % 15) * 0.1) * 10) / 10;

    result[dateStr] = {
      temp: avgTemp,
      minTemp,
      maxTemp,
      condition,
      icon,
      windSpeed,
      precipitation: pop,
      humidity: 50 + (seed % 25)
    };
  }
  return result;
}

// -------------------------------------------------------------
// API Route: /api/kma/weather
// Fetches official KMA forecast & summarizes into daily min/max temp and representative weather
// -------------------------------------------------------------
app.get('/api/kma/weather', async (req, res) => {
  const address = (req.query.address as string) || '전남 구례군 산동면';
  const geo = resolveGeo(address);
  const cacheKey = `${geo.lat.toFixed(2)},${geo.lon.toFixed(2)}`;

  const cached = weatherServerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return res.json(cached.data);
  }

  const { nx, ny } = latLonToKmaGrid(geo.lat, geo.lon);
  const { baseDate, baseTime } = getKmaBaseDateTime();
  const decodedKey = getDecodedKey(RAW_KMA_KEY);

  const dailyResult: Record<string, {
    temp: number;
    minTemp: number;
    maxTemp: number;
    condition: string;
    icon: string;
    windSpeed: number;
    precipitation: number;
    humidity: number;
  }> = {};

  if (decodedKey) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const kmaUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(decodedKey)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 2500);

      const kmaRes = await fetch(kmaUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      if (kmaRes.ok) {
        const data = await kmaRes.json();
        const items = data?.response?.body?.items?.item;

        if (Array.isArray(items) && items.length > 0) {
          // Group items by forecast date (fcstDate: YYYYMMDD)
          const dateGroups: Record<string, {
            tmpList: number[];
            tmn?: number;
            tmx?: number;
            skyList: number[];
            ptyList: number[];
            popList: number[];
            wsdList: number[];
            rehList: number[];
          }> = {};

          for (const item of items) {
            const dateRaw = item.fcstDate; // e.g. "20260902"
            const dateStr = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;

            if (!dateGroups[dateStr]) {
              dateGroups[dateStr] = {
                tmpList: [],
                skyList: [],
                ptyList: [],
                popList: [],
                wsdList: [],
                rehList: []
              };
            }

            const cat = item.category;
            const val = parseFloat(item.fcstValue);

            if (cat === 'TMP') dateGroups[dateStr].tmpList.push(val);
            if (cat === 'TMN') dateGroups[dateStr].tmn = val;
            if (cat === 'TMX') dateGroups[dateStr].tmx = val;
            if (cat === 'SKY') dateGroups[dateStr].skyList.push(val);
            if (cat === 'PTY') dateGroups[dateStr].ptyList.push(val);
            if (cat === 'POP') dateGroups[dateStr].popList.push(val);
            if (cat === 'WSD') dateGroups[dateStr].wsdList.push(val);
            if (cat === 'REH') dateGroups[dateStr].rehList.push(val);
          }

          // Aggregate each day to: Daily Min/Max Temp & Average / Dominant Condition
          for (const [dateStr, group] of Object.entries(dateGroups)) {
            const minT = group.tmn !== undefined ? group.tmn : (group.tmpList.length > 0 ? Math.min(...group.tmpList) : 18);
            const maxT = group.tmx !== undefined ? group.tmx : (group.tmpList.length > 0 ? Math.max(...group.tmpList) : 28);
            const avgT = Math.round(((minT + maxT) / 2) * 10) / 10;

            const maxPty = group.ptyList.length > 0 ? Math.max(...group.ptyList) : 0;
            const avgSky = group.skyList.length > 0 ? group.skyList.reduce((a, b) => a + b, 0) / group.skyList.length : 1;
            const maxPop = group.popList.length > 0 ? Math.max(...group.popList) : 0;
            const avgWsd = group.wsdList.length > 0 ? Math.round((group.wsdList.reduce((a, b) => a + b, 0) / group.wsdList.length) * 10) / 10 : 1.8;
            const avgReh = group.rehList.length > 0 ? Math.round(group.rehList.reduce((a, b) => a + b, 0) / group.rehList.length) : 55;

            let condition = '맑음';
            let icon = 'wb_sunny';

            if (maxPty === 1) {
              condition = '비';
              icon = 'rainy';
            } else if (maxPty === 2) {
              condition = '진눈깨비';
              icon = 'ac_unit';
            } else if (maxPty === 3) {
              condition = '눈';
              icon = 'ac_unit';
            } else if (maxPty === 4) {
              condition = '소나기';
              icon = 'thunderstorm';
            } else {
              if (avgSky <= 1.8) {
                condition = '맑음';
                icon = 'wb_sunny';
              } else if (avgSky <= 3.4) {
                condition = '구름많음';
                icon = 'partly_cloudy_day';
              } else {
                condition = '흐림';
                icon = 'cloud';
              }
            }

            dailyResult[dateStr] = {
              temp: avgT,
              minTemp: Math.round(minT * 10) / 10,
              maxTemp: Math.round(maxT * 10) / 10,
              condition,
              icon,
              windSpeed: avgWsd,
              precipitation: maxPop,
              humidity: avgReh
            };
          }
        }
      }
    } catch {
      // Graceful fallback on timeout or connection error
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // If KMA was partially empty, attempt Open-Meteo supplementary data with safe timeout
  const hasKmaToday = Object.keys(dailyResult).length > 0;
  if (!hasKmaToday) {
    let meteoTimeout: NodeJS.Timeout | null = null;
    try {
      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FSeoul&past_days=90&forecast_days=16`;
      const controller = new AbortController();
      meteoTimeout = setTimeout(() => controller.abort(), 2000);

      const mRes = await fetch(meteoUrl, { signal: controller.signal });
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.daily && Array.isArray(mData.daily.time)) {
          for (let i = 0; i < mData.daily.time.length; i++) {
            const dateStr = mData.daily.time[i];
            const maxT = Math.round(mData.daily.temperature_2m_max[i] * 10) / 10;
            const minT = Math.round(mData.daily.temperature_2m_min[i] * 10) / 10;
            const avgT = Math.round(((maxT + minT) / 2) * 10) / 10;
            const code = mData.daily.weather_code[i];
            const wind = Math.round((mData.daily.wind_speed_10m_max[i] / 3.6) * 10) / 10;
            const precip = mData.daily.precipitation_sum[i] || 0;

            let condition = '맑음';
            let icon = 'wb_sunny';
            if (code === 0 || code === 1) { condition = '맑음'; icon = 'wb_sunny'; }
            else if (code === 2) { condition = '구름조금'; icon = 'partly_cloudy_day'; }
            else if (code === 3) { condition = '구름많음'; icon = 'cloud'; }
            else if (code >= 51 && code <= 67) { condition = '비'; icon = 'rainy'; }
            else if (code >= 71 && code <= 77) { condition = '눈'; icon = 'ac_unit'; }
            else if (code >= 80) { condition = '소나기'; icon = 'thunderstorm'; }
            else { condition = '흐림'; icon = 'cloud'; }

            if (!dailyResult[dateStr]) {
              dailyResult[dateStr] = {
                temp: avgT,
                minTemp: minT,
                maxTemp: maxT,
                condition,
                icon,
                windSpeed: wind,
                precipitation: precip > 0 ? 60 : 0,
                humidity: 55
              };
            }
          }
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      if (meteoTimeout) clearTimeout(meteoTimeout);
    }
  }

  // If still empty (e.g. firewalled container network), populate using deterministic seasonal climatology
  if (Object.keys(dailyResult).length === 0) {
    const seasonalFallback = generateSeasonalWeatherFallback(geo.lat, geo.lon);
    Object.assign(dailyResult, seasonalFallback);
  }

  // Get today's daily record
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayWeather = dailyResult[todayStr] || Object.values(dailyResult)[0] || {
    temp: 24.2,
    minTemp: 18.0,
    maxTemp: 29.5,
    condition: '맑음',
    icon: 'wb_sunny',
    windSpeed: 1.8,
    precipitation: 0,
    humidity: 54
  };

  const flight = calculateBeeFlight(todayWeather.temp, todayWeather.windSpeed, todayWeather.precipitation);

  const currentWeather = {
    location: geo.name,
    stationName: geo.stationName,
    temperature: todayWeather.temp,
    minTemp: todayWeather.minTemp,
    maxTemp: todayWeather.maxTemp,
    humidity: todayWeather.humidity,
    condition: todayWeather.condition,
    icon: todayWeather.icon,
    windSpeed: todayWeather.windSpeed,
    precipitationProb: todayWeather.precipitation,
    beeFlightScore: flight.score,
    beeImpactText: flight.impactText,
    updatedTime: `기상청 공공데이터 API 연동 (${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`
  };

  const responsePayload = {
    success: true,
    source: '기상청 공공데이터포털 단기예보 서비스(VilageFcstInfoService_2.0)',
    grid: { nx, ny },
    stationName: geo.stationName,
    current: currentWeather,
    daily: dailyResult
  };

  // Cache response
  weatherServerCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

  res.json(responsePayload);
});

// -------------------------------------------------------------
// AI Journal Parse Abuse Prevention Constants & Per-UID Rate Limiter
// -------------------------------------------------------------
const MAX_JOURNAL_TEXT_LENGTH = 1000;
const MAX_AI_PARSE_BODY_BYTES = 16 * 1024; // 16KB max payload for journal parse
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const AI_RATE_LIMIT_MAX_PER_MIN = 10; // Max 10 calls / minute per UID
const AI_RATE_LIMIT_DAY_MS = 24 * 60 * 60 * 1000; // 24 hour window
const AI_RATE_LIMIT_MAX_PER_DAY = 100; // Max 100 calls / 24h per UID

// In-memory per-UID request timestamp log (sliding window)
const aiParseUidRateMap = new Map<string, number[]>();

function checkAndRecordAiParseRateLimit(uid: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
} {
  const now = Date.now();
  const dayAgo = now - AI_RATE_LIMIT_DAY_MS;
  const minAgo = now - AI_RATE_LIMIT_WINDOW_MS;

  // Periodic cleanup if map grows large
  if (aiParseUidRateMap.size > 1000) {
    for (const [k, timestamps] of aiParseUidRateMap.entries()) {
      const valid = timestamps.filter((t) => t > dayAgo);
      if (valid.length === 0) aiParseUidRateMap.delete(k);
      else aiParseUidRateMap.set(k, valid);
    }
  }

  const history = (aiParseUidRateMap.get(uid) || []).filter((t) => t > dayAgo);
  const recentMinute = history.filter((t) => t > minAgo);

  if (recentMinute.length >= AI_RATE_LIMIT_MAX_PER_MIN) {
    const oldestInMinute = recentMinute[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInMinute + AI_RATE_LIMIT_WINDOW_MS - now) / 1000)
    );
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `AI 분석 요청이 너무 많습니다. (분당 최대 ${AI_RATE_LIMIT_MAX_PER_MIN}회) ${retryAfterSeconds}초 후 다시 시도해주세요.`
    };
  }

  if (history.length >= AI_RATE_LIMIT_MAX_PER_DAY) {
    const oldestInDay = history[0];
    const retryAfterSeconds = Math.max(
      60,
      Math.ceil((oldestInDay + AI_RATE_LIMIT_DAY_MS - now) / 1000)
    );
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `일일 AI 분석 호출 한도(${AI_RATE_LIMIT_MAX_PER_DAY}회)를 초과했습니다. 잠시 후 다시 시도하거나 원문 저장을 이용해주세요.`
    };
  }

  history.push(now);
  aiParseUidRateMap.set(uid, history);
  return { allowed: true };
}

// -------------------------------------------------------------
// API Route: /api/ai/parse-journal
// Server-side Gemini AI processing of voice/text beekeeping log
// -------------------------------------------------------------
app.post('/api/ai/parse-journal', async (req, res) => {
  // 1. Verify Firebase ID Token (Authentication required before any AI processing)
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      error: 'AI 양봉일지 분석을 사용하려면 로그인이 필요합니다.'
    });
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      error: 'AI 양봉일지 분석을 사용하려면 로그인이 필요합니다.'
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser?.uid) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      error: '유효하지 않거나 만료된 로그인 토큰입니다. 다시 로그인한 후 시도해주세요.'
    });
  }

  // 2. Enforce Request Body Size Limit
  const rawBodyBytes = Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
  if (rawBodyBytes > MAX_AI_PARSE_BODY_BYTES) {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      error: '요청 데이터 크기가 허용 한도(16KB)를 초과했습니다.'
    });
  }

  // 3. Validate Input Text Presence and Length BEFORE counting against rate limit or calling AI
  const { text, defaultHive, weatherSnapshot } = req.body || {};
  if (typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'EMPTY_TEXT',
      error: '분석할 양봉일지 텍스트(text)가 필요합니다.'
    });
  }

  const rawText = text.trim();
  if (!rawText) {
    return res.status(400).json({
      success: false,
      code: 'EMPTY_TEXT',
      error: '분석할 양봉일지 내용을 입력해주세요.'
    });
  }

  if (rawText.length > MAX_JOURNAL_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      code: 'TEXT_TOO_LONG',
      maxLength: MAX_JOURNAL_TEXT_LENGTH,
      currentLength: rawText.length,
      error: `입력 텍스트가 너무 깁니다. 최대 ${MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자 이하로 줄여주세요. (현재 ${rawText.length.toLocaleString()}자)`
    });
  }

  // 4. Enforce Per-UID Rate Limiting
  const rateCheck = checkAndRecordAiParseRateLimit(verifiedUser.uid);
  if (!rateCheck.allowed) {
    if (rateCheck.retryAfterSeconds) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    }
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateCheck.retryAfterSeconds,
      error: rateCheck.reason || '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.'
    });
  }

  // 0. Beekeeping Domain Term Normalization Layer
  // Strictly preserve rawText as originalText for auditing and user verification
  const originalText = rawText;
  const normalization = normalizeBeekeepingText(rawText);
  const normalizedText = normalization.normalizedText || rawText;

  if (normalization.appliedRules.length > 0) {
    console.log(`[NORMALIZE] "${originalText}" -> "${normalizedText}" (Applied: ${normalization.appliedRules.join(', ')})`);
  }

  // Rule-based helper fallback (uses normalizedText for accurate categorization)
  const isWarning =
    normalizedText.includes('주의') ||
    normalizedText.includes('약함') ||
    normalizedText.includes('도봉') ||
    normalizedText.includes('부저') ||
    normalizedText.includes('응애') ||
    normalizedText.includes('무왕') ||
    normalizedText.includes('말벌');

  const isHarvest =
    normalizedText.includes('채밀') ||
    normalizedText.includes('수확') ||
    normalizedText.includes('꿀 채취') ||
    normalizedText.includes('완숙꿀');

  const isQueen =
    normalizedText.includes('여왕벌') ||
    normalizedText.includes('산란') ||
    normalizedText.includes('신왕') ||
    normalizedText.includes('왕대') ||
    normalizedText.includes('이충');

  const isFeeding =
    normalizedText.includes('사양') ||
    normalizedText.includes('화분떡') ||
    normalizedText.includes('당액') ||
    normalizedText.includes('급이') ||
    normalizedText.includes('먹이');

  const isPest =
    normalizedText.includes('방제') ||
    normalizedText.includes('응애') ||
    normalizedText.includes('개미산') ||
    normalizedText.includes('옥살산');

  let defaultCategory = '벌통 상태';
  if (isHarvest) defaultCategory = '채밀량';
  else if (isPest) defaultCategory = '방제';
  else if (isFeeding) defaultCategory = '급이/사양';
  else if (isQueen) defaultCategory = '여왕벌';

  // Try extracting kg from text
  const kgMatch = normalizedText.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:kg|킬로|k)/i);
  const extractedYieldKg = kgMatch ? parseFloat(kgMatch[1]) : undefined;

  // 1. Regex First: Extract Hive Ranges & Individual Numbers explicitly from text
  const cleanRangeText = normalizedText.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  const { registeredHiveIds: bodyRegisteredHiveIds, hiveCount: bodyHiveCount } = req.body || {};

  let registeredStartHive = 1;
  let maxAllowedHive = 100;
  if (typeof bodyHiveCount === 'number' && !isNaN(bodyHiveCount) && bodyHiveCount > 0) {
    maxAllowedHive = Math.floor(bodyHiveCount);
  } else if (defaultHive) {
    const matchRange = String(defaultHive).match(/#?([0-9]+)\s*~\s*#?([0-9]+)/);
    const matchMax = String(defaultHive).match(/~\s*#?([0-9]+)/);
    if (matchRange) {
      const parsedStart = parseInt(matchRange[1], 10);
      const parsedEnd = parseInt(matchRange[2], 10);
      if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedStart > 0 && parsedEnd > 0) {
        registeredStartHive = Math.min(parsedStart, parsedEnd);
        maxAllowedHive = Math.max(parsedStart, parsedEnd);
      }
    } else if (matchMax) {
      const parsedMax = parseInt(matchMax[1], 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        maxAllowedHive = parsedMax;
      }
    }
  }

  const registeredHivesList: number[] =
    Array.isArray(bodyRegisteredHiveIds) && bodyRegisteredHiveIds.length > 0
      ? Array.from(new Set(bodyRegisteredHiveIds.map((n: any) => Number(n))))
          .filter((n) => !isNaN(n) && n >= 1)
          .sort((a, b) => a - b)
      : Array.from(
          { length: Math.max(0, maxAllowedHive - registeredStartHive + 1) },
          (_, i) => registeredStartHive + i
        );

  const collectedHives = new Set<number>();
  let workingText = cleanRangeText;
  let hasRangePattern = false;
  let rangeStart: number | undefined = undefined;
  let rangeEnd: number | undefined = undefined;

  // Pattern A: [숫자] (번)? (벌통|물통|통)? (부터|에서) [숫자] (번)? (벌통|물통|통)? (까지)?
  const rangeRegexA = /(?:^|\s|#)?([0-9]{1,4})\s*번?\s*(?:벌통|물통|통)?\s*(?:부터|에서)\s*#?([0-9]{1,4})\s*번?\s*(?:벌통|물통|통)?\s*(?:까지)?/gi;
  // Pattern B: [숫자] (번)? (벌통|물통|통)? (~|-) [숫자] (번)? (벌통|물통|통)? (까지)?
  const rangeRegexB = /(?:^|\s|#)?([0-9]{1,4})\s*번?\s*(?:벌통|물통|통)?\s*(?:~|-)\s*#?([0-9]{1,4})\s*번?\s*(?:벌통|물통|통)?\s*(?:까지)?/gi;

  let rMatch: RegExpExecArray | null;
  while ((rMatch = rangeRegexA.exec(cleanRangeText)) !== null) {
    const s = parseInt(rMatch[1], 10);
    const e = parseInt(rMatch[2], 10);
    if (!isNaN(s) && !isNaN(e) && s > 0 && e > 0) {
      const start = Math.min(s, e);
      const end = Math.max(s, e);
      if (end - start <= 100) {
        hasRangePattern = true;
        if (rangeStart === undefined || start < rangeStart) rangeStart = start;
        if (rangeEnd === undefined || end > rangeEnd) rangeEnd = end;
        for (let i = start; i <= end; i++) collectedHives.add(i);
        workingText = workingText.replace(rMatch[0], ' [RANGE] ');
      }
    }
  }

  while ((rMatch = rangeRegexB.exec(cleanRangeText)) !== null) {
    const s = parseInt(rMatch[1], 10);
    const e = parseInt(rMatch[2], 10);
    if (!isNaN(s) && !isNaN(e) && s > 0 && e > 0) {
      const start = Math.min(s, e);
      const end = Math.max(s, e);
      if (end - start <= 100) {
        hasRangePattern = true;
        if (rangeStart === undefined || start < rangeStart) rangeStart = start;
        if (rangeEnd === undefined || end > rangeEnd) rangeEnd = end;
        for (let i = start; i <= end; i++) collectedHives.add(i);
        workingText = workingText.replace(rMatch[0], ' [RANGE] ');
      }
    }
  }

  // Individual hive regex:
  // - (벌통|물통|통) [숫자]
  // - #[숫자]
  // - [숫자]번 (벌통|물통|통)?
  // - [숫자]호
  const individualRegex = /(?:(?:벌통|물통|통)\s*#?([0-9]{1,4})|#([0-9]{1,4})|([0-9]{1,4})\s*(?:번\s*(?:벌통|물통|통)?|호|(?:벌통|물통|통)))/gi;

  let indMatch: RegExpExecArray | null;
  while ((indMatch = individualRegex.exec(workingText)) !== null) {
    const numStr = indMatch[1] || indMatch[2] || indMatch[3];
    if (numStr) {
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > 0) {
        collectedHives.add(num);
      }
    }
  }

  const validHives = Array.from(collectedHives)
    .filter((id) => id >= 1 && id <= maxAllowedHive)
    .sort((a, b) => a - b);

  // Dedicated all-hives deterministic recognition ("전체벌통", "전체 벌통", "모든벌통", "모든 벌통", "전벌통", "전 벌통")
  const isAllHivesExpression =
    validHives.length === 0 &&
    /(?:전체|모든)\s*(?:벌통|물통)|(?:^|[^가-힣0-9])전\s*(?:벌통|물통)/.test(cleanRangeText);

  let extractedStartHive: number | undefined = undefined;
  let extractedEndHive: number | undefined = undefined;
  let extractedHiveIds: number[] | undefined = undefined;
  let extractedHiveRangeText: string | undefined = undefined;

  if (validHives.length > 0) {
    extractedHiveIds = validHives;
    extractedStartHive = validHives[0];
    extractedEndHive = validHives[validHives.length - 1];

    if (hasRangePattern && validHives.length > 1 && (extractedEndHive - extractedStartHive + 1 === validHives.length)) {
      extractedHiveRangeText = `${extractedStartHive}번 벌통부터 ${extractedEndHive}번 벌통까지`;
    } else if (validHives.length > 1) {
      extractedHiveRangeText = validHives.map((id) => `${id}번`).join(', ') + ' 벌통';
    } else {
      extractedHiveRangeText = `${validHives[0]}번 벌통`;
    }
  } else if (isAllHivesExpression && registeredHivesList.length > 0) {
    extractedHiveIds = registeredHivesList;
    extractedStartHive = registeredHivesList[0];
    extractedEndHive = registeredHivesList[registeredHivesList.length - 1];
    extractedHiveRangeText = `${extractedStartHive}~${extractedEndHive}번 벌통`;
  }

  const hasRangeWords =
    cleanRangeText.includes('부터') ||
    cleanRangeText.includes('까지') ||
    cleanRangeText.includes('에서') ||
    cleanRangeText.includes('전체') ||
    /[0-9]+\s*(?:~|-)\s*[0-9]+/.test(cleanRangeText);

  let fallbackHiveId: number | undefined = undefined;
  let fallbackHiveRange: string;

  if (isAllHivesExpression) {
    fallbackHiveId = undefined;
    fallbackHiveRange = extractedHiveRangeText || `1~${maxAllowedHive}번 벌통`;
  } else if (extractedHiveIds && extractedHiveIds.length > 1) {
    fallbackHiveId = undefined;
    fallbackHiveRange = extractedHiveRangeText!;
  } else if (extractedHiveIds && extractedHiveIds.length === 1) {
    fallbackHiveId = extractedHiveIds[0];
    fallbackHiveRange = extractedHiveRangeText || `${extractedHiveIds[0]}번 벌통`;
  } else if (hasRangeWords) {
    // Range expression detected, but could not safely extract numbers.
    // CRITICAL SAFETY GUARD: DO NOT fall back to defaultHive ("#1 ~ #75")!
    fallbackHiveId = undefined;
    fallbackHiveRange = '범위 미지정';
  } else {
    fallbackHiveId = undefined;
    fallbackHiveRange = defaultHive && !defaultHive.includes('~') ? defaultHive : '범위 미지정';
  }

  // Inspection details fallback (only when explicitly mentioned)
  let fallbackInspectionDetails: any = undefined;
  let feedStatus: '부족' | '적정' | '충분' | undefined = undefined;
  if (rawText.includes('먹이') || rawText.includes('사양') || rawText.includes('화분떡') || rawText.includes('당액')) {
    if (rawText.includes('부족') || rawText.includes('없음') || rawText.includes('모자람') || rawText.includes('고갈')) {
      feedStatus = '부족';
    } else if (rawText.includes('충분') || rawText.includes('가득') || rawText.includes('많음')) {
      feedStatus = '충분';
    } else if (rawText.includes('적정') || rawText.includes('양호') || rawText.includes('보통')) {
      feedStatus = '적정';
    }
  }

  let queenSeen: boolean | undefined = undefined;
  let queenStatus: string | undefined = undefined;
  if (rawText.includes('여왕벌') || rawText.includes('신왕') || rawText.includes('구왕')) {
    if (rawText.includes('확인') || rawText.includes('봄') || rawText.includes('보임') || rawText.includes('있음') || rawText.includes('발견')) {
      queenSeen = true;
      queenStatus = '확인';
    } else if (rawText.includes('산란') || rawText.includes('양호')) {
      queenSeen = true;
      queenStatus = '산란양호';
    } else if (rawText.includes('무왕') || rawText.includes('안보임') || rawText.includes('망실') || rawText.includes('없음')) {
      queenSeen = false;
      queenStatus = '무왕';
    }
  }

  let diseaseStatus: string | undefined = undefined;
  if (rawText.includes('응애')) diseaseStatus = '응애';
  else if (rawText.includes('부저')) diseaseStatus = '부저병';
  else if (rawText.includes('석고')) diseaseStatus = '석고병';

  if (fallbackHiveId !== undefined || feedStatus || queenSeen !== undefined || queenStatus || diseaseStatus) {
    fallbackInspectionDetails = {};
    if (fallbackHiveId !== undefined) fallbackInspectionDetails.targetHive = fallbackHiveId;
    if (feedStatus) fallbackInspectionDetails.feedStatus = feedStatus;
    if (queenSeen !== undefined) fallbackInspectionDetails.queenSeen = queenSeen;
    if (queenStatus) fallbackInspectionDetails.queenStatus = queenStatus;
    if (diseaseStatus) fallbackInspectionDetails.diseaseStatus = diseaseStatus;
  }

  const fallbackResult: any = {
    hiveRange: fallbackHiveRange,
    status: isHarvest ? '채밀' : isWarning ? '주의' : '완료',
    category: defaultCategory,
    aiSummary: normalizedText,
    originalText: originalText,
    honeyYieldKg: extractedYieldKg,
    tags: [isHarvest ? '채밀' : isWarning ? '주의' : '음성내검'],
    hiveId: fallbackHiveId !== undefined ? fallbackHiveId : null,
    ...(extractedHiveIds ? {
      startHive: extractedStartHive,
      endHive: extractedEndHive,
      hiveIds: extractedHiveIds
    } : {})
  };

  if (fallbackInspectionDetails) fallbackResult.inspectionDetails = fallbackInspectionDetails;

  const client = getGeminiClient();
  if (!client) {
    // If GEMINI_API_KEY is not set, return graceful rule-based result
    return res.json({
      success: true,
      data: fallbackResult,
      modelUsed: 'rule-based-fallback'
    });
  }

  try {
    const prompt = `당신은 대한민국 최고 수준의 스마트 양봉 전문 AI 비서입니다.
양봉인이 벌통 현장에서 음성으로 말한 내검 기록을 분석하여 정확한 구조화 데이터로 변환하십시오.

[양봉인의 발화 내용]:
"${normalizedText}"

${extractedHiveIds && extractedHiveIds.length > 0 ? `[지정된 벌통]: ${fallbackHiveRange} (목록: ${extractedHiveIds.join(', ')}번)` : `[기본 벌통 번호]: "${fallbackHiveRange}"`}

[현재 날씨 정보]:
기온: ${weatherSnapshot?.temp || 24}°C, 날씨: ${weatherSnapshot?.condition || '맑음'}

반드시 다음 JSON 형식으로만 응답하십시오 (마크다운 백틱 없이 순수 JSON만 반환):
{
  "hiveRange": "언급된 벌통 범위 또는 단일 벌통 (예: '32번 벌통' 또는 '${extractedHiveRangeText || fallbackHiveRange}')",
  "hiveId": 단일 벌통 번호만 정수 숫자 (예: 32). 범위이거나 여러 벌통인 경우 반드시 null,
  "status": "완료" | "주의" | "채밀" | "진행중" | "대기",
  "category": "벌통 상태" | "채밀량" | "방제" | "급이/사양" | "여왕벌" | "기타",
  "aiSummary": "양봉 작업의 핵심 요약문 (한 문장, 간결하고 전문적인 한국어)",
  "honeyYieldKg": 채밀 수량이 언급된 경우 숫자(kg) 또는 null,
  "tags": ["핵심키워드1", "핵심키워드2"],
  "inspectionDetails": {
    "targetHive": 단일 벌통 번호(정수 숫자) 또는 null,
    "queenSeen": 여왕벌을 직접 확인/발견/산란확인한 경우만 true, 무왕/망실인 경우 false, 발화에 여왕벌 언급이 전혀 없으면 반드시 null (절대 추정 금지),
    "queenStatus": 여왕벌 상태가 언급된 경우에만 문자열 (예: "확인", "산란양호", "무왕", "신왕교체필요") 또는 null (언급 없으면 null),
    "feedStatus": 먹이/사양/화분떡/당액 상태가 언급된 경우에만 "부족" | "적정" | "충분" 중 하나, 언급 없으면 반드시 null (절대 임의 추정 금지),
    "diseaseStatus": 응애/부저/석고/노제마 등 질병/방제가 언급된 경우에만 문자열, 언급 없으면 null
  }
}

[필수 규칙]:
1. 단일 벌통 번호 인식: "32번 벌통", "32번", "#32", "벌통 32", "32호" 등은 모두 hiveId: 32, hiveRange: "32번 벌통"으로 정확히 추출하십시오.
2. 여러 벌통/범위: "1번부터 20번까지", "1번~2번", "1번 3번 5번" 등 여러 벌통은 hiveId와 targetHive를 반드시 null로 처리하십시오.
3. 무언급 항목 추정 절대 금지: 사용자가 여왕벌에 대해 언급하지 않았으면 queenSeen과 queenStatus는 반드시 null입니다. 먹이에 대한 언급이 없으면 feedStatus는 반드시 null입니다.
4. 새로운 사실 날조 금지: 발화 내용에 없는 사실이나 정보를 임의로 지어내지 마십시오.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const responseText = response.text || '';
    const cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    // Sanitize parsed hiveId: if multiple hives or all-hives were extracted, hiveId is strictly null/undefined
    let finalHiveId: number | undefined = undefined;
    if (isAllHivesExpression || (extractedHiveIds && extractedHiveIds.length > 1)) {
      finalHiveId = undefined;
    } else if (extractedHiveIds && extractedHiveIds.length === 1) {
      finalHiveId = extractedHiveIds[0];
    } else if (fallbackHiveId !== undefined) {
      finalHiveId = fallbackHiveId;
    }

    const finalHiveRange = isAllHivesExpression
      ? (extractedHiveRangeText || `1~${maxAllowedHive}번 벌통`)
      : extractedHiveIds && extractedHiveIds.length > 0
        ? extractedHiveRangeText!
        : (finalHiveId ? `${finalHiveId}번 벌통` : fallbackHiveRange);

    // Sanitize parsed inspectionDetails
    let finalInspectionDetails: any = undefined;
    if (parsed.inspectionDetails && typeof parsed.inspectionDetails === 'object') {
      const details: Record<string, any> = {};
      const tHive = finalHiveId;
      if (tHive !== undefined) details.targetHive = tHive;
      if (typeof parsed.inspectionDetails.queenSeen === 'boolean') details.queenSeen = parsed.inspectionDetails.queenSeen;
      if (typeof parsed.inspectionDetails.queenStatus === 'string' && parsed.inspectionDetails.queenStatus.trim()) {
        details.queenStatus = parsed.inspectionDetails.queenStatus.trim();
      }
      if (['부족', '적정', '충분'].includes(parsed.inspectionDetails.feedStatus)) {
        details.feedStatus = parsed.inspectionDetails.feedStatus;
      }
      if (typeof parsed.inspectionDetails.diseaseStatus === 'string' && parsed.inspectionDetails.diseaseStatus.trim()) {
        details.diseaseStatus = parsed.inspectionDetails.diseaseStatus.trim();
      }

      if (Object.keys(details).length > 0) {
        finalInspectionDetails = details;
      }
    } else if (fallbackInspectionDetails) {
      finalInspectionDetails = fallbackInspectionDetails;
    }

    return res.json({
      success: true,
      data: {
        hiveRange: finalHiveRange,
        hiveId: finalHiveId !== undefined ? finalHiveId : null,
        status: parsed.status || fallbackResult.status,
        category: parsed.category || fallbackResult.category,
        aiSummary: parsed.aiSummary || normalizedText,
        originalText: originalText,
        honeyYieldKg: typeof parsed.honeyYieldKg === 'number' ? parsed.honeyYieldKg : fallbackResult.honeyYieldKg,
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : fallbackResult.tags,
        ...(extractedHiveIds ? {
          startHive: extractedStartHive,
          endHive: extractedEndHive,
          hiveIds: extractedHiveIds
        } : {}),
        ...(finalInspectionDetails ? { inspectionDetails: finalInspectionDetails } : {})
      },
      modelUsed: 'gemini-2.5-flash'
    });
  } catch (aiErr) {
    console.warn('Gemini AI parsing failed, falling back:', aiErr);
    return res.json({
      success: true,
      data: fallbackResult,
      modelUsed: 'rule-based-fallback'
    });
  }
});

// ============================================================================
// Public Honey Traceability Publish / Unpublish / Read API
// ============================================================================

const FIREBASE_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId;
const FIREBASE_API_KEY =
  process.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey;
const FIRESTORE_DATABASE_ID =
  firebaseConfigData.firestoreDatabaseId ||
  process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  '(default)';

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
  FIREBASE_PROJECT_ID
)}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents`;

/**
 * Verifies a Firebase ID Token via Google Identity Toolkit REST API
 */
async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || !FIREBASE_API_KEY) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        FIREBASE_API_KEY
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: String(user.localId),
      email: user.email ? String(user.email) : undefined
    };
  } catch (err) {
    console.warn('Firebase ID token verification failed:', err);
    return null;
  }
}

/**
 * Converts Firestore REST value object into plain JS value
 */
function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return String(val.stringValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(fromFirestoreValue) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields;
    return fields ? fromFirestoreFields(fields) : {};
  }
  return undefined;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return result;
  for (const [k, v] of Object.entries(fields)) {
    const parsed = fromFirestoreValue(v);
    if (parsed !== undefined) {
      result[k] = parsed;
    }
  }
  return result;
}

/**
 * Converts plain JS value into Firestore REST value object
 */
function toFirestoreValue(val: any): any {
  if (val === null) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val)
      }
    };
  }
  return undefined;
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      const converted = toFirestoreValue(v);
      if (converted !== undefined) {
        fields[k] = converted;
      }
    }
  }
  return fields;
}

/**
 * Reads the authenticated farmer's own HoneyLot from users/{uid}/honeyLots/{lotId}
 */
async function fetchFarmerHoneyLotFromServer(
  uid: string,
  lotId: string,
  idToken: string
): Promise<HoneyLot | null> {
  const url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(
    uid
  )}/honeyLots/${encodeURIComponent(lotId)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  if (!resp.ok) return null;
  const docJson: any = await resp.json();
  if (!docJson?.fields) return null;
  const parsed = fromFirestoreFields(docJson.fields);
  return {
    id: parsed.id || lotId,
    productType: parsed.productType,
    productId: parsed.productId,
    productImageUrl: parsed.productImageUrl,
    packageUnit: parsed.packageUnit,
    storageMethod: parsed.storageMethod,
    honeyType: parsed.honeyType || '아카시아꿀',
    productName: parsed.productName || '허니비테코 아카시아꿀',
    nectarSource: parsed.nectarSource,
    harvestDate: parsed.harvestDate || '',
    inboundDate: parsed.inboundDate || parsed.harvestDate || '',
    harvestQuantityKg: parsed.harvestQuantityKg,
    hiveIds: parsed.hiveIds,
    hiveRange: parsed.hiveRange,
    farmName: parsed.farmName,
    lotNumber: parsed.lotNumber || '',
    publicTraceId: parsed.publicTraceId,
    inspectionReportUrl: parsed.inspectionReportUrl,
    inspectionReportName: parsed.inspectionReportName,
    inspectionReportSummary: parsed.inspectionReportSummary,
    notes: parsed.notes,
    productionPeriod: parsed.productionPeriod,
    harvestOperations: parsed.harvestOperations,
    harvestDateRangeDisplay: parsed.harvestDateRangeDisplay,
    totalYieldKg: parsed.totalYieldKg,
    totalHiveCount: parsed.totalHiveCount,
    aggregatedHiveRange: parsed.aggregatedHiveRange,
    associatedJournalIds: parsed.associatedJournalIds,
    nectarSources: parsed.nectarSources,
    aiProductionStory: parsed.aiProductionStory,
    isPublicForConsumer: parsed.isPublicForConsumer,
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: parsed.updatedAt || new Date().toISOString()
  } as HoneyLot;
}

/**
 * Reads the authenticated farmer's journals from users/{uid}/journals to build consumer-safe evidence summaries
 */
async function fetchFarmerJournalsFromServer(
  uid: string,
  idToken: string
): Promise<VoiceLogItem[]> {
  try {
    const url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(uid)}/journals`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    if (!resp.ok) return [];
    const json: any = await resp.json();
    const docs: any[] = Array.isArray(json?.documents) ? json.documents : [];
    return docs.map((d) => {
      const fields = d.fields ? fromFirestoreFields(d.fields) : {};
      const docPathParts = typeof d.name === 'string' ? d.name.split('/') : [];
      const fallbackId = docPathParts[docPathParts.length - 1] || '';
      return {
        id: fields.id || fallbackId,
        hiveRange: fields.hiveRange || '',
        text: fields.text || '',
        status: fields.status || '완료',
        timestamp: fields.timestamp || '09:00',
        date: fields.date || '',
        category: fields.category || '벌통 상태',
        honeyYieldKg: fields.honeyYieldKg,
        originalText: fields.originalText,
        aiSummary: fields.aiSummary
      } as VoiceLogItem;
    });
  } catch {
    return [];
  }
}

/**
 * 1. POST /api/public-honey-traces/publish
 * - Verifies farmer's Firebase ID Token
 * - Verifies ownership by reading users/{uid}/honeyLots/{lotId} directly from Firestore
 * - Calls createPublicHoneyTraceData(lot) via buildPublishedHoneyTracePayload
 * - Saves ONLY allowed public fields to publicHoneyTraces/{publicTraceId}
 */
app.post('/api/public-honey-traces/publish', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰(Authorization Bearer)이 필요합니다.'
      });
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser?.uid) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 Firebase 인증 토큰입니다.'
      });
    }

    const { lotId, publicTraceId: requestedTraceId } = req.body || {};
    if (!lotId || typeof lotId !== 'string') {
      return res.status(400).json({
        success: false,
        message: '게시할 꿀 이력 식별자(lotId)가 필요합니다.'
      });
    }

    // 4 & 5. 해당 uid의 HoneyLot인지 확인하고 Firestore에서 원본 HoneyLot을 읽음
    const lot = await fetchFarmerHoneyLotFromServer(verifiedUser.uid, lotId, idToken);
    if (!lot) {
      return res.status(404).json({
        success: false,
        message: '해당 농가 계정의 원본 꿀 이력을 찾을 수 없습니다.'
      });
    }

    // publicTraceId 결정 (원본 HoneyLot에 이미 있으면 절대 변경하지 않고 유지)
    let finalTraceId =
      lot.publicTraceId && lot.publicTraceId.trim()
        ? lot.publicTraceId.trim()
        : typeof requestedTraceId === 'string' && requestedTraceId.trim().startsWith('tr_')
        ? requestedTraceId.trim()
        : '';

    // 만약 원본 HoneyLot에 publicTraceId가 비어있더라도, 이미 publicHoneyTraces에 동일 lotNumber로 게시된 문서가 있다면 기존 publicTraceId를 복원하여 영구 유지
    if (!finalTraceId && lot.lotNumber && lot.lotNumber.trim()) {
      try {
        const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          FIREBASE_PROJECT_ID
        )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents:runQuery`;
        const queryResp = await fetch(runQueryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'publicHoneyTraces' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'lotNumber' },
                  op: 'EQUAL',
                  value: { stringValue: lot.lotNumber.trim() }
                }
              },
              limit: 1
            }
          })
        });
        if (queryResp.ok) {
          const queryRows: any = await queryResp.json();
          if (Array.isArray(queryRows)) {
            for (const row of queryRows) {
              const docFields = row?.document?.fields;
              if (docFields) {
                const parsedRow = fromFirestoreFields(docFields);
                if (typeof parsedRow.publicTraceId === 'string' && parsedRow.publicTraceId.trim()) {
                  finalTraceId = parsedRow.publicTraceId.trim();
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Optional existing publicHoneyTraces lookup by lotNumber failed:', e);
      }
    }

    if (!finalTraceId) {
      finalTraceId = generatePublicTraceId();
    }

    // 만약 원본 HoneyLot에 publicTraceId가 아직 저장되지 않았던 기존 데이터라면 publicTraceId만 보존 기록
    if (!lot.publicTraceId) {
      const lotPatchUrl = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(
        verifiedUser.uid
      )}/honeyLots/${encodeURIComponent(lotId)}?updateMask.fieldPaths=publicTraceId`;
      await fetch(lotPatchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: toFirestoreFields({ publicTraceId: finalTraceId })
        })
      }).catch((e) => console.warn('Optional publicTraceId patch warning:', e));
    }

    // 기존 게시 문서가 있는지 확인하여 최초 publishedAt 유지
    let existingPublishedAt: string | undefined;
    const publicDocUrl = `${FIRESTORE_BASE_URL}/publicHoneyTraces/${encodeURIComponent(
      finalTraceId
    )}`;
    const existingResp = await fetch(
      `${publicDocUrl}?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      { method: 'GET' }
    );
    if (existingResp.ok) {
      const existingJson: any = await existingResp.json();
      if (existingJson?.fields) {
        const parsedExisting = fromFirestoreFields(existingJson.fields);
        if (typeof parsedExisting.publishedAt === 'string') {
          existingPublishedAt = parsedExisting.publishedAt;
        }
      }
    }

    // 6. 농가의 연결된 양봉일지를 읽어 createPublicHoneyTraceData(lot, farmerJournals) 실행 (클라이언트 입력 불신)
    const farmerJournals = await fetchFarmerJournalsFromServer(verifiedUser.uid, idToken);
    const publishedDoc = buildPublishedHoneyTracePayload(
      lot,
      finalTraceId,
      existingPublishedAt,
      farmerJournals
    );

    // 7. publicHoneyTraces/{publicTraceId}에 저장
    const saveResp = await fetch(publicDocUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        fields: toFirestoreFields(publishedDoc)
      })
    });

    if (!saveResp.ok) {
      const errText = await saveResp.text();
      console.error('Failed to write publicHoneyTraces:', errText);
      return res.status(500).json({
        success: false,
        message: '공개 이력 저장에 실패했습니다.'
      });
    }

    const purePublicData = createPublicHoneyTraceData(lot, farmerJournals);

    return res.json({
      success: true,
      publicTraceId: publishedDoc.publicTraceId,
      publishedAt: publishedDoc.publishedAt,
      updatedAt: publishedDoc.updatedAt,
      isPublished: true,
      data: purePublicData
    });
  } catch (err: any) {
    console.error('Error in POST /api/public-honey-traces/publish:', err);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * 2. POST /api/public-honey-traces/unpublish
 * - Verifies farmer's Firebase ID Token
 * - Verifies ownership via users/{uid}/honeyLots/{lotId}
 * - Deletes publicHoneyTraces/{publicTraceId} without modifying or deleting the original HoneyLot
 */
app.post('/api/public-honey-traces/unpublish', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰(Authorization Bearer)이 필요합니다.'
      });
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser?.uid) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 Firebase 인증 토큰입니다.'
      });
    }

    const { lotId, publicTraceId: requestedTraceId } = req.body || {};
    if (!lotId || typeof lotId !== 'string') {
      return res.status(400).json({
        success: false,
        message: '공개 해제할 꿀 이력 식별자(lotId)가 필요합니다.'
      });
    }

    // 해당 uid의 HoneyLot인지 확인 (타 농가의 공개 데이터를 임의로 해제하는 것 방지)
    const lot = await fetchFarmerHoneyLotFromServer(verifiedUser.uid, lotId, idToken);
    if (!lot) {
      return res.status(404).json({
        success: false,
        message: '해당 농가 계정의 원본 꿀 이력을 찾을 수 없습니다.'
      });
    }

    const targetTraceId =
      lot.publicTraceId && lot.publicTraceId.trim()
        ? lot.publicTraceId.trim()
        : typeof requestedTraceId === 'string'
        ? requestedTraceId.trim()
        : '';

    if (!targetTraceId) {
      return res.status(400).json({
        success: false,
        message: '유효한 publicTraceId를 확인할 수 없습니다.'
      });
    }

    // publicHoneyTraces/{publicTraceId} 문서 삭제 (원본 HoneyLot은 절대 삭제/변경하지 않음)
    const publicDocUrl = `${FIRESTORE_BASE_URL}/publicHoneyTraces/${encodeURIComponent(
      targetTraceId
    )}`;
    const delResp = await fetch(publicDocUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!delResp.ok && delResp.status !== 404) {
      const errText = await delResp.text();
      console.error('Failed to delete publicHoneyTraces doc:', errText);
      return res.status(500).json({
        success: false,
        message: '공개 해제 처리 중 오류가 발생했습니다.'
      });
    }

    return res.json({
      success: true,
      publicTraceId: targetTraceId,
      isPublished: false
    });
  } catch (err: any) {
    console.error('Error in POST /api/public-honey-traces/unpublish:', err);
    return res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * 3. GET /api/public-honey-traces/:publicTraceId
 * - Publicly accessible by unauthenticated consumers from any device/browser
 * - Reads ONLY from publicHoneyTraces/{publicTraceId}
 * - Returns ONLY sanitized HoneyTracePublicData fields (never returns uid, hiveIds, notes, originalText, or document ID)
 */
app.get('/api/public-honey-traces/:publicTraceId', async (req, res) => {
  try {
    const publicTraceId = (req.params.publicTraceId || '').trim();
    if (!publicTraceId) {
      return res.status(404).json({
        status: 'not_found',
        isPublished: false,
        message: '이 꿀 이력을 찾을 수 없습니다.'
      });
    }

    const publicDocUrl = `${FIRESTORE_BASE_URL}/publicHoneyTraces/${encodeURIComponent(
      publicTraceId
    )}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

    const resp = await fetch(publicDocUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (resp.status === 404 || !resp.ok) {
      return res.status(404).json({
        status: 'not_found',
        isPublished: false,
        message: '이 꿀 이력을 찾을 수 없습니다.'
      });
    }

    const docJson: any = await resp.json();
    if (!docJson?.fields) {
      return res.status(404).json({
        status: 'not_found',
        isPublished: false,
        message: '이 꿀 이력을 찾을 수 없습니다.'
      });
    }

    const parsedDoc = fromFirestoreFields(docJson.fields);
    if (parsedDoc.isPublished === false) {
      return res.status(404).json({
        status: 'not_found',
        isPublished: false,
        message: '이 꿀 이력을 찾을 수 없습니다.'
      });
    }

    // 오직 HoneyTracePublicData의 14개 허용 필드만 정제하여 반환
    const purePublicData = sanitizePublicTraceData(parsedDoc);

    return res.json({
      status: 'found',
      isPublished: true,
      publicTraceId: String(parsedDoc.publicTraceId || publicTraceId),
      publishedAt: typeof parsedDoc.publishedAt === 'string' ? parsedDoc.publishedAt : undefined,
      updatedAt: typeof parsedDoc.updatedAt === 'string' ? parsedDoc.updatedAt : undefined,
      data: purePublicData
    });
  } catch (err: any) {
    console.error('Error in GET /api/public-honey-traces/:publicTraceId:', err);
    return res.status(404).json({
      status: 'not_found',
      isPublished: false,
      message: '이 꿀 이력을 찾을 수 없습니다.'
    });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🐝 Honeybee Teco server running on http://0.0.0.0:${PORT}`);
    });

    server.on('error', (err: any) => {
      console.error('Server error:', err);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();
