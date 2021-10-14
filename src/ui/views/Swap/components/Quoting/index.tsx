import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import quotingBorder from 'ui/assets/quoting-border.svg';
import quotingBg from 'ui/assets/quoting-bg.svg';
import './style.less';

interface QuotingProps {
  dapps: { logo: string; name: string; id: string }[];
  currentIndex: number;
}

const Quoting = ({ dapps, currentIndex }: QuotingProps) => {
  const { t } = useTranslation();

  return (
    <div className="quoting">
      <p className="quoting-title">{t('Inquiring from...')}</p>
      <div className="quoting-main">
        <img src={quotingBorder} className="quoting-main__border" />
        <div className="quoting-main__round">
          <img
            className="quoting-main__round-logo"
            src={dapps[currentIndex].logo}
          />
          <p className="quoting-main__round-name">{dapps[currentIndex].name}</p>
        </div>
        <img src={quotingBg} className="quoting-main__bg" />
      </div>
    </div>
  );
};

export default Quoting;
