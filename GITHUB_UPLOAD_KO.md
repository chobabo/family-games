# GitHub 업로드 안내

이 폴더에는 버전 10까지의 Git 변경 이력이 포함되어 있습니다.

## 1. GitHub에서 빈 저장소 만들기

1. GitHub에 로그인합니다.
2. 오른쪽 위 `+` → `New repository`를 선택합니다.
3. Repository name에 `family-games`를 입력합니다.
4. `Public`을 선택합니다.
5. `Add a README file`, `.gitignore`, `Choose a license`는 선택하지 않습니다.
6. `Create repository`를 누릅니다.

## 2. Mac에서 저장소 연결하기

터미널을 열고 압축을 해제한 폴더로 이동합니다.

```bash
cd ~/Downloads/family-games-github
git status
```

GitHub 사용자 이름을 넣어 SSH 주소를 연결합니다.

```bash
git remote add origin git@github.com:YOUR_GITHUB_NAME/family-games.git
git push -u origin main
```

HTTPS를 사용하는 경우 다음과 같이 연결합니다.

```bash
git remote add origin https://github.com/YOUR_GITHUB_NAME/family-games.git
git push -u origin main
```

GitHub는 계정 비밀번호를 Git 명령의 인증 수단으로 받지 않습니다. HTTPS 인증 화면이 나타나면 브라우저 로그인 또는 GitHub에서 발급한 인증 수단을 사용합니다.

## 3. 업로드 확인

GitHub의 `family-games` 페이지를 새로고침하고 다음 항목을 확인합니다.

- `README.md`가 첫 화면에 표시되는지
- `dist/` 폴더에 게임 코드가 있는지
- `dist/assets/` 폴더에 캐릭터 이미지가 있는지
- `ゲーム実行.command` 파일이 있는지
- 커밋 이력에 버전 10까지의 변경이 표시되는지

## 이후 변경을 올리는 방법

```bash
git add .
git commit -m "Describe the change"
git push
```
