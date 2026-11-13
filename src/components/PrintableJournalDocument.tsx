import React, { useMemo } from 'react';
import { JournalExportData, FormattedJournalRow } from '../services/pdfExportService';

interface PrintableJournalDocumentProps {
  exportData: JournalExportData;
}

const PAGE_1_MAX_ROWS = 9;
const PAGE_NEXT_MAX_ROWS = 14;

export const PrintableJournalDocument: React.FC<PrintableJournalDocumentProps> = ({
  exportData
}) => {
  const { farmerInfo, queryPeriodDisplay, stats, rows } = exportData;

  // Split rows into distinct A4 pages so rows are never split across page breaks
  const pages: FormattedJournalRow[][] = useMemo(() => {
    if (!rows || rows.length === 0) return [[]];

    const result: FormattedJournalRow[][] = [];
    let currentIdx = 0;

    // Page 1
    const page1Rows = rows.slice(0, PAGE_1_MAX_ROWS);
    result.push(page1Rows);
    currentIdx += page1Rows.length;

    // Subsequent pages
    while (currentIdx < rows.length) {
      const nextRows = rows.slice(currentIdx, currentIdx + PAGE_NEXT_MAX_ROWS);
      result.push(nextRows);
      currentIdx += nextRows.length;
    }

    return result;
  }, [rows]);

  const totalPages = pages.length;
  const printedDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');

  return (
    <div
      style={{
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {pages.map((pageRows, pageIdx) => {
        const isFirstPage = pageIdx === 0;

        return (
          <div
            key={`page-${pageIdx}`}
            className="pdf-page"
            style={{
              width: '794px',
              height: '1123px',
              minHeight: '1123px',
              maxHeight: '1123px',
              padding: '40px 45px 35px 45px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              fontFamily:
                '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
              color: '#1a1a1a',
              overflow: 'hidden'
            }}
          >
            {/* Top Area */}
            <div>
              {/* Page 1 Header */}
              {isFirstPage ? (
                <>
                  <div
                    style={{
                      borderBottom: '3px solid #7e5700',
                      paddingBottom: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#7e5700',
                          backgroundColor: '#ffdeac',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}
                      >
                        스마트 양봉 관리 대장
                      </span>
                      <h1
                        style={{
                          fontSize: '24px',
                          fontWeight: 900,
                          margin: 0,
                          letterSpacing: '-0.5px',
                          color: '#2b1e00'
                        }}
                      >
                        허니비테코 양봉일지
                      </h1>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
                      발행일자: <strong>{printedDate}</strong>
                    </div>
                  </div>

                  {/* Farmer Info Grid */}
                  <div
                    style={{
                      backgroundColor: '#faf8f5',
                      border: '1px solid #e8dec8',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      lineHeight: '1.5'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                      <div>
                        <span style={{ color: '#777', width: '70px', display: 'inline-block' }}>
                          농가명:
                        </span>
                        <strong>{farmerInfo.farmName || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#777', width: '70px', display: 'inline-block' }}>
                          대표자:
                        </span>
                        <strong>{farmerInfo.representative || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#777', width: '70px', display: 'inline-block' }}>
                          봉장 소재지:
                        </span>
                        <span>{farmerInfo.apiaryLocation || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#777', width: '70px', display: 'inline-block' }}>
                          조회기간:
                        </span>
                        <strong style={{ color: '#7e5700' }}>{queryPeriodDisplay}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Summary Statistics Box */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      backgroundColor: '#fef9ee',
                      border: '1px solid #f2dbb3',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#7e5700', fontWeight: 'bold' }}>
                        총 기록 수
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#2b1e00' }}>
                        {stats.totalCount} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>건</span>
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2cfb0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#7e5700', fontWeight: 'bold' }}>
                        기록 벌통 수
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#2b1e00' }}>
                        {stats.hiveCount} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>통</span>
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2cfb0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#7e5700', fontWeight: 'bold' }}>
                        총 채밀량
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#b34700' }}>
                        {stats.totalYieldKg > 0 ? `${stats.totalYieldKg} kg` : '-'}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Subsequent Pages Header */
                <div
                  style={{
                    borderBottom: '2px solid #7e5700',
                    paddingBottom: '8px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#2b1e00' }}>
                    허니비테코 양봉일지 (계속)
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    조회기간: <strong>{queryPeriodDisplay}</strong>
                  </div>
                </div>
              )}

              {/* Journal Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                  tableLayout: 'fixed'
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1ede4',
                      borderTop: '1px solid #7e5700',
                      borderBottom: '1px solid #c7baa7',
                      color: '#443b2f',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                  >
                    <th style={{ width: '68px', padding: '7px 4px' }}>날짜</th>
                    <th style={{ width: '48px', padding: '7px 2px' }}>시간</th>
                    <th style={{ width: '85px', padding: '7px 4px' }}>벌통</th>
                    <th style={{ width: '75px', padding: '7px 4px' }}>유형</th>
                    <th style={{ padding: '7px 6px', textAlign: 'left' }}>양봉 기록</th>
                    <th style={{ width: '60px', padding: '7px 4px' }}>채밀량</th>
                    <th style={{ width: '85px', padding: '7px 4px' }}>날씨</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length > 0 ? (
                    pageRows.map((row, rIdx) => {
                      const isEven = rIdx % 2 === 1;

                      // Status tag styling
                      let catColor = '#59452b';
                      let catBg = '#f2ece4';
                      if (row.category === '채밀량') {
                        catColor = '#a84e00';
                        catBg = '#ffeed9';
                      } else if (row.category === '방제') {
                        catColor = '#a12b2b';
                        catBg = '#feebeb';
                      } else if (row.category === '여왕벌') {
                        catColor = '#72318e';
                        catBg = '#f7ebff';
                      } else if (row.category === '급이/사양') {
                        catColor = '#1d6a2f';
                        catBg = '#eaf7ec';
                      }

                      return (
                        <tr
                          key={row.id || `r-${rIdx}`}
                          style={{
                            backgroundColor: isEven ? '#faf8f5' : '#ffffff',
                            borderBottom: '1px solid #ebe5da',
                            verticalAlign: 'top'
                          }}
                        >
                          {/* 날짜 */}
                          <td
                            style={{
                              padding: '8px 4px',
                              textAlign: 'center',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.date.replace(/^[0-9]{4}-/, '')}
                          </td>

                          {/* 시간 */}
                          <td
                            style={{
                              padding: '8px 2px',
                              textAlign: 'center',
                              color: '#666',
                              fontSize: '10.5px'
                            }}
                          >
                            {row.time}
                          </td>

                          {/* 벌통 */}
                          <td
                            style={{
                              padding: '8px 4px',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              color: '#2b1e00',
                              wordBreak: 'break-all'
                            }}
                          >
                            {row.hiveDisplay}
                          </td>

                          {/* 기록 유형 */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: catColor,
                                backgroundColor: catBg,
                                padding: '2px 5px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {row.category}
                            </span>
                          </td>

                          {/* 양봉 기록 (aiSummary/text + inspectionDetails) */}
                          <td
                            style={{
                              padding: '8px 6px',
                              lineHeight: '1.45',
                              wordBreak: 'break-word'
                            }}
                          >
                            <div style={{ color: '#1a1a1a', fontWeight: 500 }}>
                              {row.content}
                            </div>
                            {row.inspectionSummary && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: '#7e5700',
                                  marginTop: '3px',
                                  fontWeight: 600
                                }}
                              >
                                ↳ {row.inspectionSummary}
                              </div>
                            )}
                          </td>

                          {/* 채밀량 */}
                          <td
                            style={{
                              padding: '8px 4px',
                              textAlign: 'center',
                              fontWeight: row.honeyYieldDisplay !== '-' ? 700 : 'normal',
                              color: row.honeyYieldDisplay !== '-' ? '#b34700' : '#888'
                            }}
                          >
                            {row.honeyYieldDisplay}
                          </td>

                          {/* 날씨 */}
                          <td
                            style={{
                              padding: '8px 4px',
                              textAlign: 'center',
                              fontSize: '10px',
                              color: '#555',
                              lineHeight: '1.3'
                            }}
                          >
                            {row.weatherDisplay}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: '#888',
                          fontSize: '12px'
                        }}
                      >
                        해당 기간의 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Area */}
            <div
              style={{
                borderTop: '1px solid #e0d6c5',
                paddingTop: '8px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#777'
              }}
            >
              <div>
                허니비테코 스마트 양봉 관리 시스템 · 무단 복제 및 전재를 금합니다.
              </div>
              <div style={{ fontWeight: 'bold', color: '#444' }}>
                - {pageIdx + 1} / {totalPages} -
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
