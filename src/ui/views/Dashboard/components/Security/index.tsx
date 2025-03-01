import { DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconTokenApproval from 'ui/assets/icon-token-approval.svg';
import IconNFTApproval from 'ui/assets/nft-approval.svg';
import { Field, Popup } from 'ui/component';
import './style.less';

interface SecurityProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const Security = ({ visible, onClose }: SecurityProps) => {
  const history = useHistory();
  const { t } = useTranslation();

  const renderData = [
    {
      leftIcon: IconTokenApproval,
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
      content: t('Token Approval'),
      onClick: () => history.push('/token-approval'),
    },
    {
      leftIcon: IconNFTApproval,
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
      content: t('NFT Approval'),
      onClick: () => history.push('/nft-approval'),
    },
  ];

  return (
    <>
      <Popup
        visible={visible}
        onClose={onClose}
        height={240}
        bodyStyle={{ height: '100%', paddingBottom: 0 }}
        title="Security"
      >
        <div className="popup-security">
          <div className="content">
            {renderData.map((data, index) => (
              <Field
                key={index}
                leftIcon={<img src={data.leftIcon} className="icon" />}
                onClick={data.onClick}
                rightIcon={data.rightIcon}
              >
                {data.content}
              </Field>
            ))}
          </div>
          <footer className="footer">
            <div>{t('More features coming soon')}</div>
          </footer>
        </div>
      </Popup>
    </>
  );
};

export default Security;
