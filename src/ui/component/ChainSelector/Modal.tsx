import React, { ReactNode, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Drawer } from 'antd';

import { Chain } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { useWallet, useWalletOld } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import eventBus from '@/eventBus';
import ChainCard from '../ChainCard';
import clsx from 'clsx';
interface ChainSelectorModalProps {
  visible: boolean;
  value: CHAINS_ENUM;
  onCancel(): void;
  onChange(val: CHAINS_ENUM): void;
  connection?: boolean;
  title?: ReactNode;
  className?: string;
  offset?: number;
  trigger?: string;
}

const ChainSelectorModal = ({
  title,
  visible,
  onCancel,
  onChange,
  value,
  connection = false,
  className,
  offset,
  trigger,
}: ChainSelectorModalProps) => {
  const wallet = useWalletOld();
  const history = useHistory();
  const location = useLocation();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [savedChainsData, setSavedChainsData] = useState<Chain[]>([]);

  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };
  const goToChainManagement = () => {
    history.push({
      pathname: '/settings/chain',
      state: {
        connection,
        backurl: history?.location?.pathname,
        trigger,
      },
    });
  };
  const init = async () => {
    const savedChains = await wallet.getSavedChains();
    const savedChainsData = savedChains
      .map((item) => {
        return Object.values(CHAINS).find((chain) => chain.enum === item);
      })
      .filter(Boolean);
    setSavedChainsData(savedChainsData);
  };

  useEffect(() => {
    init();
    const accountChangeHandler = (data) => {
      if (data && data.address) {
        setCurrentAccount(data);
      }
    };
    eventBus.addEventListener('accountsChanged', accountChangeHandler);
    return () => {
      eventBus.removeEventListener('accountsChanged', accountChangeHandler);
    };
  }, []);
  let maxHeight =
    Math.round(savedChainsData.length / 2) * 64 + 74 + (title ? 56 : 0);
  const range = [130, 450].map((item) => item + (title ? 56 : 0));
  if (connection && maxHeight > 258) {
    maxHeight = 258;
  }
  return (
    <Drawer
      title={title}
      width="400px"
      closable={false}
      placement={'bottom'}
      visible={visible}
      onClose={handleCancel}
      className={clsx(
        'chain-selector__modal',
        connection && 'connection',
        className
      )}
      contentWrapperStyle={{
        height:
          (maxHeight > range[1]
            ? range[1]
            : maxHeight < range[0]
            ? range[0]
            : maxHeight) + (offset || 0),
      }}
      drawerStyle={{
        height:
          (maxHeight > range[1]
            ? range[1]
            : maxHeight < range[0]
            ? range[0]
            : maxHeight) + (offset || 0),
      }}
      destroyOnClose
    >
      <>
        {savedChainsData.length === 0 && (
          <div className="no-pinned-container">No pinned chains</div>
        )}
        {savedChainsData.length > 0 && (
          <ul className="chain-selector-options">
            {savedChainsData.map((chain) => (
              <ChainCard
                chain={chain}
                key={chain.id}
                showIcon={false}
                plus={false}
                className="w-[176px] h-[56px]"
                onClick={() => handleChange(chain.enum as CHAINS_ENUM)}
              />
            ))}
          </ul>
        )}
        <div className="all-chais" onClick={goToChainManagement}>
          <span>{'All chains >'}</span>
        </div>
      </>
    </Drawer>
  );
};

export default ChainSelectorModal;
