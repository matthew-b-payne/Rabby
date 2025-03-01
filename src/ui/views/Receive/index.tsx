import { Modal } from '@/ui/component';
import { Button, message } from 'antd';
import { Account } from 'background/service/preference';
import ClipboardJS from 'clipboard';
import {
  CHAINS,
  KEYRING_CLASS,
  KEYRING_ICONS_WHITE,
  WALLET_BRAND_CONTENT,
} from 'consts';
import QRCode from 'qrcode.react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as IconBack } from 'ui/assets/back.svg';
import IconCopy from 'ui/assets/icon-copy-1.svg';
import IconEyeHide from 'ui/assets/icon-eye-hide.svg';
import IconEye from 'ui/assets/icon-eye.svg';
import IconSuccess from 'ui/assets/icon-success-1.svg';
import IconWarning from 'ui/assets/icon-warning-large.svg';
import IconLogo from 'ui/assets/rabby-white-large.svg';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import './style.less';

const useAccount = () => {
  const wallet = useWallet();

  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string>();
  const [name, setName] = useState<string>();
  const [cacheBalance, setCacheBalance] = useState<number>();
  const [balance, setBalance] = useState<number>();
  useEffect(() => {
    wallet.syncGetCurrentAccount().then((a) => {
      setAccount(a);
      setAddress(a!.address.toLowerCase());
    });
  }, []);
  useEffect(() => {
    if (address) {
      wallet.getAlianName(address).then(setName);

      wallet
        .getAddressCacheBalance(address)
        .then((d) => setCacheBalance(d!.total_usd_value));
      wallet
        .getAddressBalance(address)
        .then((d) => setBalance(d.total_usd_value));
    }
  }, [address]);

  return {
    ...account,
    address,
    name,
    balance: balance ?? cacheBalance,
  };
};

const useReceiveTitle = (search: string) => {
  const qs = useMemo(() => query2obj(search), [search]);
  const chain = CHAINS[qs.chain]?.name || 'Ethereum';
  const token = qs.token || 'assets';

  return `Receive ${token} on ${chain}`;
};

const Receive = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();
  const [isShowAccount, setIsShowAccount] = useState(true);

  const ref = useRef<HTMLButtonElement>(null);

  const account = useAccount();
  const title = useReceiveTitle(history.location.search);

  useEffect(() => {
    const clipboard = new ClipboardJS(ref.current!, {
      text: function () {
        return account.address || '';
      },
    });

    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{account.address}</div>
          </div>
        ),
      });
    });
    return () => clipboard.destroy();
  }, [account.address]);

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }
  };
  useEffect(() => {
    init();
  }, []);
  useEffect(() => {
    if (account?.type !== KEYRING_CLASS.WATCH) {
      return;
    }
    const modal = Modal.info({
      maskClosable: false,
      closable: false,
      className: 'page-receive-modal',
      content: (
        <div>
          <img className="icon" src={IconWarning} alt="" />
          <div className="content">
            This is a Watch Mode address.
            <br />
            Are you sure to use it to receive assets?
          </div>
          <div className="footer">
            <Button
              type="primary"
              block
              onClick={() => {
                modal.destroy();
                history.goBack();
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              className="rabby-btn-ghost"
              ghost
              block
              onClick={() => {
                modal.destroy();
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      ),
    });
    return () => {
      modal.destroy();
    };
  }, [account?.type]);
  return (
    <div className="page-receive">
      <div className="page-nav">
        <div
          className="page-nav-left pointer"
          onClick={() => {
            history.goBack();
          }}
        >
          <IconBack className="icon-back"></IconBack>
        </div>
        {isShowAccount && (
          <div className="page-nav-content">
            <div className="account">
              <img
                className="account-icon opacity-60"
                src={
                  KEYRING_ICONS_WHITE[account.type as string] ||
                  WALLET_BRAND_CONTENT[account.brandName as string]?.image
                }
              />
              <div className="account-content">
                <div className="row">
                  <div className="account-name" title={account.name}>
                    {account.name}
                  </div>
                  <div className="account-balance">
                    ${splitNumberByStep((account.balance || 0).toFixed(2))}
                  </div>
                </div>
                {account.type === KEYRING_CLASS.WATCH && (
                  <div className="account-type">Watch Mode address</div>
                )}
              </div>
            </div>
          </div>
        )}
        <div
          className="page-nav-right pointer"
          onClick={() => {
            setIsShowAccount((v) => !v);
          }}
        >
          {isShowAccount ? <img src={IconEye} /> : <img src={IconEyeHide} />}
        </div>
      </div>

      <div className="qr-card">
        <div className="qr-card-header">{title}</div>
        <div className="qr-card-img">
          {account?.address && <QRCode value={account.address} size={175} />}
        </div>
        <div className="qr-card-address">{account?.address}</div>
        <button type="button" className="qr-card-btn" ref={ref}>
          <img src={IconCopy} alt="" className="icon-copy" />
          Copy address
        </button>
      </div>
      <div className="page-receive-footer">
        <img src={IconLogo} alt="" />
      </div>
    </div>
  );
};

export default Receive;
