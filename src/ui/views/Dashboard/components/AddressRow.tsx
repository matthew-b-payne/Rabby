import React from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';

import { Account } from '@/background/service/preference';

import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconFavStarFilled from 'ui/assets/dashboard/favstar-filled.svg';
import IconFavStar from 'ui/assets/dashboard/favstar.svg';

import { splitNumberByStep, useWallet } from 'ui/utils';
import { message } from 'antd';
import {
  KEYRING_ICONS,
  KEYRING_WITH_INDEX,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { AddressViewer } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import useIsMountedRef from '@/ui/hooks/useMountedRef';

function AddressRow({
  data,
  index,
  style,
  copiedSuccess = false,
  handleClickChange,
}: {
  data: Account[];
  index: number;
  style: React.StyleHTMLAttributes<HTMLDivElement>;
  copiedSuccess?: boolean;
  handleClickChange?: (account: Account) => any;
}) {
  const wallet = useWallet();
  const { highlightedAddresses } = useRabbySelector((s) => ({
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));
  const dispatch = useRabbyDispatch();

  const account = data[index];
  const favorited = highlightedAddresses.some(
    (highlighted) =>
      account.address === highlighted.address &&
      account.brandName === highlighted.brandName
  );

  const handleCopyContractAddress = React.useCallback(() => {
    const clipboard = new ClipboardJS('.address-item', {
      text: function () {
        return account?.address;
      },
    });
    clipboard.on('success', () => {
      message.success({
        duration: 1,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{account?.address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  }, [account]);

  const isMountedRef = useIsMountedRef();
  const [hdPathIndex, setHDPathIndex] = React.useState(null);
  React.useEffect(() => {
    if (KEYRING_WITH_INDEX.includes(account.type)) {
      wallet.getIndexByAddress(account.address, account.type).then((index) => {
        if (!isMountedRef.current) return;
        if (index !== null) {
          setHDPathIndex(index + 1);
        }
      });
    }
  }, [account]);

  return (
    <div
      className={clsx(
        'flex items-center address-item',
        favorited && 'favorited'
      )}
      key={index}
      style={style}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target?.dataset?.action !== 'copyIcon') {
          handleClickChange?.(account);
        }
      }}
    >
      {' '}
      <img
        className="icon icon-account-type w-[20px] h-[20px]"
        src={
          KEYRING_ICONS[account.type] ||
          WALLET_BRAND_CONTENT[account.brandName]?.image
        }
      />
      <div className="flex flex-col items-start ml-10 relative w-[100%]">
        <div className="text-13 text-black text-left click-name">
          <div className="flex items-center w-[100%]">
            <div className="list-alian-name" title={account?.alianName}>
              {account?.alianName}
              {hdPathIndex && (
                <span className="address-hdpath-index font-roboto-mono">{`#${hdPathIndex}`}</span>
              )}
            </div>
            <span className={clsx('ml-[3px] favorite-star')}>
              <img
                onClick={(e) => {
                  e.stopPropagation();
                  if (account)
                    dispatch.addressManagement.toggleHighlightedAddressAsync({
                      address: account.address,
                      brandName: account.brandName,
                    });
                }}
                src={favorited ? IconFavStarFilled : IconFavStar}
                className={clsx('w-[12px] h-[12px]')}
              />
            </span>
          </div>
          <div className="flex items-center">
            <AddressViewer
              address={account?.address}
              showArrow={false}
              className={'address-color'}
            />
            <img
              onClick={handleCopyContractAddress}
              src={IconAddressCopy}
              data-action={'copyIcon'}
              className={clsx('ml-7 w-[16px] h-[16px]', {
                success: copiedSuccess,
              })}
            />
            <div className={'money-color'}>
              ${splitNumberByStep(Math.floor(account?.balance || 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default connectStore()(AddressRow);
